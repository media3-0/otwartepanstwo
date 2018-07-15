#!/bin/bash

set -e

psql "postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/postgres" <<-EOSQL
  CREATE TABLE IF NOT EXISTS exports (
    id SERIAL,
    hash TEXT
  );
EOSQL
