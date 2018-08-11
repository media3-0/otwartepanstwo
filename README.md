# otwartepanstwo

## env

Some keys are required for app to work properly:

```
POSTGRES_PASSWORD=... # password to be used for postgres DB
POSTGRES_USER=...     # user to be used for postgres DB
POSTGRES_DB=...       # name to be used for postgres DB
```

For dev, this could be set in `PROJECT_ROOT/.env`, for production use it's preffered to `export` them in the shell.

## dev setup

1. `yarn install`
2. `yarn run build:dev` or `./scripts/build.dev.sh`

## dev run

1. `yarn run start:dev` or `./scripts/start.dev.sh`
2. `open http://localhost:8080`

## crawlers

For development, list of active crawlers can be specified:

```bash
DEV_CRAWLERS="abw.js|cba.js" ./scripts/start.dev.sh
```

