// const IS_DEV = process.env.NODE_ENV === "development";
const DOCUMENTS_TABLE = "documents";

const fs = require("fs");
const http = require("http");
const async = require("async");
const crypto = require("crypto");
const knex = require("knex");
const pdfExtractor = require("pdf-text-extract");

const runCrawlers = require("./run-crawlers");

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
  return new Promise(resolve => {
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
  const db = await createDB();
  const crawledData = await runCrawlers({
    onEach: list => {
      async.eachLimit(
        list,
        10,
        (current, next) => {
          const hash = crypto
            .createHash("md5")
            .update(current.url)
            .digest("hex");

          console.log("PROCESSING " + hash);
          const updateDate = Math.floor(new Date().getTime() / 1000);

          db(DOCUMENTS_TABLE)
            .where({ hash })
            .then(rows => {
              const isNew = rows.length === 0;
              if (isNew) {
                console.log("#" + hash + " IS NEW, FETCHING AND PARSING");
                fetchAndParse({ url: current.url, hash }).then(parsedText => {
                  console.log("#" + hash + " DOWNLOADED AND PARSED");
                  db(DOCUMENTS_TABLE)
                    .insert({
                      hash,
                      url: current.url,
                      ["last_download"]: updateDate,
                      content: parsedText,
                      title: current.title,
                      date: current.date,
                      ["source_name"]: current.sourceName
                    })
                    .then(() => {
                      next(null);
                    });
                });
              } else {
                console.log("#" + hash + " EXISTS, UPDATING");
                db(DOCUMENTS_TABLE)
                  .where({ hash })
                  .update({ ["last_download"]: updateDate })
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
    }
  });
})();
