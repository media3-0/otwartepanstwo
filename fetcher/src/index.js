const IS_DEV = process.env.NODE_ENV === "development";
const PDFS_TABLE_NAME = "documents";

const fs = require("fs");
const http = require("http");
const async = require("async");
const crypto = require("crypto");
const knex = require("knex");
const pdfExtractor = require("pdf-text-extract");

const runCrawlers = require("./run-crawlers");

const createDB = () =>
  new Promise((resolve, reject) => {
    const connection = `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@db:5432/postgres`;

    const db = knex({
      client: "pg",
      connection
    });

    // test connection and callback if ok
    db
      .raw("select 1 + 1 as result")
      .then(() => resolve(db))
      .catch(e => reject(e));
  });

const readOneFile = path => {
  return new Promise((resolve, reject) => {
    pdfExtractor(path, { splitPages: false, layout: "raw" }, (err, content) => {
      if (err) {
        reject(err);
      } else {
        resolve(content);
      }
    });
  });
};

const fetchAndParse = ({ url, hash }) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(`/data/files/${hash}.pdf`);
    http.get(url, response => {
      response.pipe(file);
      file.on("finish", () => {
        file.close(() => {
          readOneFile(`/data/files/${hash}.pdf`).then(parsedText => resolve(parsedText));
        });
      });
    });
  });
};

(async () => {
  console.log("FETCHER STARTED");
  const db = await createDB();
  const crawledData = await runCrawlers();

  async.eachLimit(
    crawledData,
    10,
    (current, next) => {
      const hash = crypto
        .createHash("md5")
        .update(current.url)
        .digest("hex");

      console.log("PROCESSING " + hash);
      const updateDate = Math.floor(new Date().getTime() / 1000);

      db(PDFS_TABLE_NAME)
        .where({ hash })
        .then(rows => {
          const isNew = rows.length === 0;
          if (isNew) {
            console.log("#" + hash + " IS NEW, FETCHING AND PARSING");
            fetchAndParse({ url: current.url, hash }).then(parsedText => {
              console.log("#" + hash + " DOWNLOADED AND PARSED");
              db(PDFS_TABLE_NAME)
                .insert({ hash, url: current.url, last_download: updateDate, content: parsedText })
                .then(() => {
                  next(null);
                });
            });
          } else {
            console.log("#" + hash + " EXISTS, UPDATING");
            db(PDFS_TABLE_NAME)
              .where({ hash })
              .update({ last_download: updateDate })
              .then(() => {
                next(null);
              });
          }
        });
    },
    () => {
      console.log("FINISHED");
    }
  );
})();
