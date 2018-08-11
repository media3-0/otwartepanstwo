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

  // TODO: this should be query string but I can't figure out nginx for that
  app.get("/documents/:search?", (req, res) => {
    const { search } = req.params;
    const fields = ["title", "date", "last_download", "source_name", "hash"];

    const callback = data => res.json(data);

    if (search) {
      db(DOCUMENTS_TABLE)
        .select(...fields)
        .where("content", "ilike", `%${search}%`) // TODO: search title as well
        .then(callback);
    } else {
      db(DOCUMENTS_TABLE)
        .select(...fields)
        .then(callback);
    }
  });

  app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
  });
};

init();
