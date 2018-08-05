#!/usr/bin/env bash

PGPASSWORD=$POSTGRES_PASSWORD psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -h "localhost" -p 5432
