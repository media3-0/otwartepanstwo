const changeCaseKeys = require("change-case-keys");
const express = require("express");
const knex = require("knex");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const paginator = require("./knex-paginate");

const toClient = obj => changeCaseKeys(obj, "camelize");

const PORT = process.env.PORT || 5000;
const DOCUMENTS_TABLE = "documents";

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
  app.set("trust proxy", 1); // needed for express-rate-limit

  // v1
  const v1RateLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 100 });

  app.get("/v1/sources", v1RateLimiter, (req, res) => {
    db(DOCUMENTS_TABLE)
      .distinct()
      .pluck("source_name")
      .then(sources => res.json(toClient(sources)));
  });

  app.get("/v1/documents/", v1RateLimiter, (req, res) => {
    const { search, dateFrom, dateTo, sourceName, hash, page, perPage, sortBy, sortDirection } = req.query;
    const fields = ["title", "date", "last_download", "source_name", "hash", "url"];

    let query = db(DOCUMENTS_TABLE).select(...fields);

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

    if (sortBy) {
      query = query.orderBy(sortBy, sortDirection);
    }

    paginator(db, query, { page: page ? parseInt(page) : 1, perPage: Math.min(perPage || 20, 100) }).then(
      ({ pagination, data }) =>
        res.json(
          toClient({
            page: pagination.currentPage,
            totalPages: pagination.lastPage,
            data
          })
        )
    );
  });

  app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
  });
};

init();
