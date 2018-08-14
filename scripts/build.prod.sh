#!/usr/bin/env bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR/.." || exit 1

# move data tiles out of shared volume for faster build
mv docker/data/files ../

docker-compose -f docker/docker-compose.prod.yml build

mv ../files docker/data/
