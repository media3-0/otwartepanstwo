# otwartepanstwo

## env

Some keys are required for app to work properly:

```
POSTGRES_PASSWORD=... # password to be used for postgres DB
POSTGRES_USER=...     # user to be used for postgres DB
POSTGRES_DB=...       # name to be used for postgres DB

AUTH0_DOMAIN=...      # auth0 domain without "https://"
AUTH0_CLIENTID=...    # client id for auth0
AUTH0_REDIRECT=...    # redirect (callback) for auth0

MAILGUN_API_KEY=...   # api key for mailgun
MAILGUN_DOMAIN=...    # domain for mailgun

ADMIN_EMAILS=...      # list of emails that grants access to admin panel
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

