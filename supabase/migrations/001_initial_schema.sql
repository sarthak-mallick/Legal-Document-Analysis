-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- Documents table
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  filename text not null,
  file_size integer,
  document_type text,
  upload_status text default 'processing',
  page_count integer,
  summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Document chunks with embeddings
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content text not null,
  chunk_index integer not null,
  chunk_type text default 'text',
  section_title text,
  page_number integer,
  embedding vector(768),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Conversations
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  document_ids uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages within conversations
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null,
  content text not null,
  citations jsonb default '[]',
  tool_calls jsonb default '[]',
  created_at timestamptz default now()
);

-- Indexes (if not exists is implicit for create index — use a DO block)
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'idx_chunks_document') then
    create index idx_chunks_document on document_chunks(document_id);
  end if;
  if not exists (select 1 from pg_indexes where indexname = 'idx_chunks_embedding') then
    create index idx_chunks_embedding on document_chunks using hnsw (embedding vector_cosine_ops);
  end if;
  if not exists (select 1 from pg_indexes where indexname = 'idx_messages_conversation') then
    create index idx_messages_conversation on messages(conversation_id);
  end if;
  if not exists (select 1 from pg_indexes where indexname = 'idx_documents_user') then
    create index idx_documents_user on documents(user_id);
  end if;
  if not exists (select 1 from pg_indexes where indexname = 'idx_conversations_user') then
    create index idx_conversations_user on conversations(user_id);
  end if;
end $$;

-- Row Level Security
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

-- Policies (drop + create to make idempotent)
drop policy if exists "Users can manage own documents" on documents;
create policy "Users can manage own documents" on documents for all using (auth.uid() = user_id);

drop policy if exists "Users can read own chunks" on document_chunks;
create policy "Users can read own chunks" on document_chunks for all using (
  document_id in (select id from documents where user_id = auth.uid())
);

drop policy if exists "Users can manage own conversations" on conversations;
create policy "Users can manage own conversations" on conversations for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own messages" on messages;
create policy "Users can manage own messages" on messages for all using (
  conversation_id in (select id from conversations where user_id = auth.uid())
);

-- Vector similarity search function (create or replace is already idempotent)
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
