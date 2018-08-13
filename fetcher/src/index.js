const async = require("async");
const crypto = require("crypto");
const fs = require("fs");
const knex = require("knex");
const moment = require("moment");
const pdfExtractor = require("pdf-text-extract");
const request = require("request-promise");

const logger = require("./logger");
const runCrawlers = require("./run-crawlers");
const updateSubscriptions = require("./update-subscriptions");

const IS_DEV = process.env.NODE_ENV === "development";
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

    request({
      uri: url,
      method: "GET",
      encoding: "binary",
      headers: {
        "Content-type": "applcation/pdf"
      }
    })
      .then(response => {
        file.write(response, "binary");

        file.on("finish", () => {
          file.close(() => {
            readOneFile(`/data/files/${hash}.pdf`)
              .then(parsedText => resolve(parsedText))
              .catch(err => reject(err));
          });
        });

        file.end();
      })
      .catch(err => {
        reject(err);

        file.end();
      });
  });
};

const processCrawlers = async ({ db }) => {
  const updateDate = moment().format("YYYY-MM-DD");

  const cargo = async.cargo(([item], callback) => {
    const hash = crypto
      .createHash("md5")
      .update(item.url)
      .digest("hex");

    db(DOCUMENTS_TABLE)
      .where({ hash })
      .then(rows => {
        const isNew = rows.length === 0;

        if (isNew) {
          logger.info(`${item.sourceName} - #${hash} is new - fetching & parsing`);

          fetchAndParse({ url: item.url, hash })
            .then(parsedText => {
              logger.info(`${item.sourceName} - #${hash} downloaded & parsed `);

              db(DOCUMENTS_TABLE)
                .insert({
                  hash,
                  url: item.url,
                  ["last_download"]: updateDate,
                  content: parsedText,
                  title: item.title,
                  date: item.date,
                  ["source_name"]: item.sourceName
                })
                .then(() => {
                  logger.info(`${item.sourceName} - #${hash} put into db`);
                  callback();
                });
            })
            .catch(err => {
              logger.error(`Fetch and parse error: ${err}`);
              callback();
            });
        } else {
          logger.info(`#${hash} exists - updating`);

          db(DOCUMENTS_TABLE)
            .where({ hash })
            .update({ ["last_download"]: updateDate })
            .then(() => {
              logger.info(`${item.sourceName} - #${hash} updated in db`);
              callback();
            });
        }
      });
  }, 1);

  return new Promise(resolve => {
    const crawlers = runCrawlers();

    let isDone = false;
    let isProcessed = false;
    let intervalHandle;

    const allDone = () => {
      if (isDone && isProcessed) {
        logger.info("All done");

        if (intervalHandle) {
          clearInterval(intervalHandle);
        }

        resolve();
      }
    };

    if (IS_DEV) {
      intervalHandle = setInterval(() => {
        const len = cargo.length();

        if (len > 0) {
          logger.info(`Cargo left to process: ${len}`);
        }
      }, 1000);
    }

    cargo.drain = () => {
      logger.info("Cargo drained");

      isProcessed = true;
      allDone();
    };

    crawlers.on("data", item => {
      if (IS_DEV) {
        logger.info(`New item "${item.title}" (${item.url})`);
      }

      isProcessed = false;
      cargo.push(item);
    });

    crawlers.on("done", () => {
      logger.info("Crawlers finished");

      isDone = true;
      allDone();
    });
  });
};

(async () => {
  logger.info(`Fetcher started at ${moment().toISOString()}`);

  const db = await createDB();

  await processCrawlers({ db });

  await updateSubscriptions({ db });

  logger.info(`Fetcher finished at ${moment().toISOString()}`);
})();
