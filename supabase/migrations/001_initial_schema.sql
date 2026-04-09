-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- Documents table
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  filename text not null,
  file_size integer,
  document_type text, -- 'insurance_policy', 'lease', 'contract', 'nda', 'terms_of_service', 'unknown'
  upload_status text default 'processing', -- 'processing', 'ready', 'error'
  page_count integer,
  summary text, -- auto-generated summary after processing
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Document chunks with embeddings
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content text not null, -- the chunk text
  chunk_index integer not null, -- ordering within the document
  chunk_type text default 'text', -- 'text', 'table', 'heading', 'list'
  section_title text, -- the section this chunk belongs to (e.g., "Liability Coverage")
  page_number integer,
  embedding vector(768), -- Gemini text-embedding-004 produces 768 dimensions
  metadata jsonb default '{}', -- stores raw table data, surrounding context, etc.
  created_at timestamptz default now()
);

-- Conversations
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  document_ids uuid[] default '{}', -- which documents this conversation references
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages within conversations
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null, -- 'user', 'assistant'
  content text not null,
  citations jsonb default '[]', -- [{chunk_id, section_title, page_number, snippet}]
  tool_calls jsonb default '[]', -- log of MCP/tool calls made for this response
  created_at timestamptz default now()
);

-- Indexes
create index idx_chunks_document on document_chunks(document_id);
create index idx_chunks_embedding on document_chunks using hnsw (embedding vector_cosine_ops);
create index idx_messages_conversation on messages(conversation_id);
create index idx_documents_user on documents(user_id);
create index idx_conversations_user on conversations(user_id);

-- Row Level Security
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

create policy "Users can manage own documents" on documents for all using (auth.uid() = user_id);
create policy "Users can read own chunks" on document_chunks for all using (
  document_id in (select id from documents where user_id = auth.uid())
);
create policy "Users can manage own conversations" on conversations for all using (auth.uid() = user_id);
create policy "Users can manage own messages" on messages for all using (
  conversation_id in (select id from conversations where user_id = auth.uid())
);

-- Vector similarity search function
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
