#!/bin/bash

set -e

# TODO: add indexes!

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE TABLE IF NOT EXISTS documents (
    hash TEXT,
    url TEXT,
    content TEXT,
    last_download TEXT,
    date TEXT,
    title TEXT,
    source_name TEXT
  );
EOSQL
