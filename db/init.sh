#!/bin/bash

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE TABLE IF NOT EXISTS documents (
    hash TEXT,
    url TEXT,
    content TEXT,
    content_lower TEXT,
    last_download DATE,
    date DATE,
    title TEXT,
    type TEXT,
    source_name TEXT
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    email TEXT,
    search_phrase TEXT,
    document_source TEXT,
    last_notify DATE
  );

  CREATE TABLE IF NOT EXISTS articles (
    id SERIAL,
    content JSONB,
    date DATE,
    title TEXT
  );

  CREATE EXTENSION pg_trgm;
  CREATE INDEX idx_documents_content_lower ON documents USING gin (content_lower gin_trgm_ops);
  CREATE INDEX idx_documents_content ON documents USING gin (content gin_trgm_ops);
  CREATE INDEX idx_documents_title ON documents USING gin (title gin_trgm_ops);
EOSQL

