create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  filename text not null,
  file_size integer,
  document_type text,
  upload_status text not null default 'processing',
  page_count integer,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  content text not null,
  chunk_index integer not null,
  chunk_type text not null default 'text',
  section_title text,
  page_number integer,
  embedding vector(768),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  document_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null,
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  tool_calls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_chunks_document on document_chunks(document_id);
create index if not exists idx_messages_conversation on messages(conversation_id);
create index if not exists idx_documents_user on documents(user_id);

-- Use HNSW instead of IVFFlat: works on empty tables (no training data needed)
-- and provides better recall for small-to-medium datasets.
create index if not exists idx_chunks_embedding
  on document_chunks
  using hnsw (embedding vector_cosine_ops);

create index if not exists idx_conversations_user on conversations(user_id);

alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

drop policy if exists "Users can manage own documents" on documents;
create policy "Users can manage own documents"
  on documents
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own chunks" on document_chunks;
create policy "Users can read own chunks"
  on document_chunks
  for all
  using (
    document_id in (
      select id from documents where user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage own conversations" on conversations;
create policy "Users can manage own conversations"
  on conversations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own messages" on messages;
create policy "Users can manage own messages"
  on messages
  for all
  using (
    conversation_id in (
      select id from conversations where user_id = auth.uid()
    )
  );

-- Auto-update updated_at on row modification.
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_updated_at
  before update on documents
  for each row execute function update_updated_at();

create trigger conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at();

create or replace function match_chunks(
  query_embedding vector(768),
  match_count int default 5,
  filter_document_ids uuid[] default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  chunk_type text,
  section_title text,
  page_number integer,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_type,
    dc.section_title,
    dc.page_number,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  where (filter_document_ids is null or dc.document_id = any(filter_document_ids))
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;
