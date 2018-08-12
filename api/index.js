const express = require("express");
const knex = require("knex");
const morgan = require("morgan");

const DOCUMENTS_TABLE = "documents";
const PORT = process.env.PORT || 4000;

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

  app.use(morgan("combined"));
  app.use(express.json());

  app.get("/health-check", (req, res) => {
    res.send("ok");
  });

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
      query = query.where(function() {
        this.where("content", "ilike", `%${search}%`).orWhere("title", "ilike", `%${search}%`);
      });
    }

    query.select(...fields).then(data => res.json(data));
  });

  app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
  });
};

init();
