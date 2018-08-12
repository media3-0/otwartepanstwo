const express = require("express");
const jwksRsa = require("jwks-rsa");
const jwt = require("express-jwt");
const knex = require("knex");
const moment = require("moment");
const morgan = require("morgan");
const changeCaseKeys = require("change-case-keys");

const DOCUMENTS_TABLE = "documents";
const SUBSCRIPTIONS_TABLE = "subscriptions";
const PORT = process.env.PORT || 4000;

const toClient = obj => changeCaseKeys(obj, "camelize");
const toDB = obj => changeCaseKeys(obj, "underscored");

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_CLIENTID,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ["RS256"]
});

const createDB = () =>
  new Promise((resolve, reject) => {
    const db = knex({
      client: "pg",
      connection: {
        host: "db",
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD
      }
    });

    // test connection and callback if ok
    db.raw("select 1 + 1 as result")
      .then(() => resolve(db))
      .catch(e => reject(e));
  });

const init = async () => {
  const app = express();
  const db = await createDB();

  // setup
  app.use(morgan("combined"));
  app.use(express.json());

  app.get("/health-check", (req, res) => {
    res.send("ok");
  });

  // documents
  app.get("/documents/", (req, res) => {
    const { search, dateFrom, dateTo, sourceName } = req.query;
    const fields = ["title", "date", "last_download", "source_name", "hash"];

    let query = db(DOCUMENTS_TABLE);

    if (dateFrom) {
      query = query.where("date", ">", dateFrom);
    }

    if (dateTo) {
      query = query.where("date", "<", dateTo);
    }

    if (sourceName) {
      query = query.where("source_name", "=", sourceName);
    }

    if (search) {
      query = query.where(knex.raw(`LOWER(title  || ' ' || content) LIKE LOWER('%${search}%')`));
    }

    query.select(...fields).then(documents => res.json(toClient(documents)));
  });

  // subscriptions (protected api)
  app.get("/subscriptions", checkJwt, (req, res) => {
    const { email } = req.user;

    if (!email) {
      return res.status(400).send({ reason: "`email` missing" });
    }

    db(SUBSCRIPTIONS_TABLE)
      .select()
      .where({ email })
      .then(subscriptions => {
        res.json(toClient(subscriptions));
      });
  });

  app.post("/subscriptions", checkJwt, (req, res) => {
    const { email } = req.user;
    const { search } = req.body;

    if (!email) {
      return res.status(400).send({ reason: "`email` missing" });
    }

    if (!search) {
      return res.status(400).send({ reason: "`search` missing" });
    }

    db(SUBSCRIPTIONS_TABLE)
      .insert(
        toDB({
          email,
          searchPhrase: search,
          lastNotify: moment().format("YYYY-MM-DD")
        })
      )
      .then(res => {
        res.send({ ok: true });
      });
  });

  app.delete("/subscriptions", checkJwt, (req, res) => {
    const { email } = req.user;
    const { search } = req.body;

    if (!email) {
      return res.status(400).send({ reason: "`email` missing" });
    }

    if (!search) {
      return res.status(400).send({ reason: "`search` missing" });
    }

    db(SUBSCRIPTIONS_TABLE)
      .where(
        toDB({
          email,
          searchPhrase: search
        })
      )
      .delete()
      .then(res => {
        res.send({ ok: true });
      });
  });

  // start
  app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
  });
};

init();
