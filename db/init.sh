#!/bin/bash

set -e

psql "postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/postgres" <<-EOSQL
  CREATE TABLE IF NOT EXISTS documents (
    hash TEXT,
    url TEXT,
    content TEXT,
    last_download TEXT
  );
EOSQL
