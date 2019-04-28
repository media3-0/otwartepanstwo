const express = require("express");
const jwksRsa = require("jwks-rsa");
const jwt = require("express-jwt");
const knex = require("knex");
const setupPaginator = require("knex-paginator");
const moment = require("moment");
const morgan = require("morgan");
const changeCaseKeys = require("change-case-keys");
const multer = require("multer");

const simpleCrud = require("./simple-crud");

const DOCUMENTS_TABLE = "documents";
const SUBSCRIPTIONS_TABLE = "subscriptions";
const PORT = process.env.PORT || 4000;

const toClient = obj => changeCaseKeys(obj, "camelize");
const toDB = obj => changeCaseKeys(obj, "underscored");

const upload = multer({ dest: "/data/uploads/" });

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

    setupPaginator(db);

    // test connection and callback if ok
    db
      .raw("select 1 + 1 as result")
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

  // articles
  app.use(
    simpleCrud({
      basePath: "/articles",
      collection: "articles",
      fields: ["title", "date", "content"],
      fieldFormatters: { date: value => moment(value).format("YYYY-MM-DD") },
      db,
      authMiddleware: checkJwt
    })
  );

  // source names
  app.get("/source-names", (req, res) => {
    db(DOCUMENTS_TABLE)
      .distinct()
      .pluck("source_name")
      // .select("source_name")
      .then(sources => res.json(toClient(sources)));
  });

  // documents
  app.get("/documents/", (req, res) => {
    const { search, dateFrom, dateTo, sourceName, hash } = req.query;
    const fields = ["title", "date", "last_download", "source_name", "hash", "url"];

    let query = db(DOCUMENTS_TABLE);

    if (hash) {
      query = query.where("hash", "=", hash);
    }

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
      query = query.where(db.raw(`content_lower LIKE '%${search}%'`));
    }

    query
      .select(...fields)
      .paginate(20, 1, true)
      .then(paginator => {
        console.log("current page", paginator.current_page);
        res.json(toClient(paginator.data));
      });
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
    const { search, documentSource } = req.body;

    if (!email) {
      return res.status(400).send({ reason: "`email` missing" });
    }

    if (!search && !documentSource) {
      return res.status(400).send({ reason: "`search` and `documentSource` missing" });
    }

    db(SUBSCRIPTIONS_TABLE)
      .insert(
        toDB({
          email,
          searchPhrase: search,
          documentSource,
          lastNotify: moment().format("YYYY-MM-DD")
        })
      )
      .then(() => {
        res.send({ ok: true });
      });
  });

  app.delete("/subscriptions", checkJwt, (req, res) => {
    const { email } = req.user;
    const { search, documentSource } = req.body;

    if (!email) {
      return res.status(400).send({ reason: "`email` missing" });
    }

    if (!search && !documentSource) {
      return res.status(400).send({ reason: "`search` and `documentSource` missing" });
    }

    db(SUBSCRIPTIONS_TABLE)
      .where(
        search
          ? toDB({
              email,
              searchPhrase: search
            })
          : toDB({
              email,
              documentSource
            })
      )
      .del()
      .then(() => {
        res.send({ ok: true });
      });
  });

  // uploads
  app.post("/upload", upload.single("asset"), (req, res) => {
    console.log(req.file);
    res.send({ filePath: `/uploads/${req.file.filename}` });
  });

  // start
  app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
  });
};

init();
