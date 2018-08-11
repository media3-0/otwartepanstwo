// const IS_DEV = process.env.NODE_ENV === "development";
const DOCUMENTS_TABLE = "documents";

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
  return new Promise(resolve => {
    const file = fs.createWriteStream(`/data/files/${hash}.pdf`);
    request({
      uri: url,
      method: "GET",
      encoding: "binary",
      headers: {
        "Content-type": "applcation/pdf"
      }
    }).then(response => {
      // response.pipe(file);
      file.write(response, "binary");
      file.on("finish", () => {
        file.close(() => {
          readOneFile(`/data/files/${hash}.pdf`).then(parsedText => resolve(parsedText));
        });
      });
      file.end();
    });
  });
};

const processCrawlers = async ({ db }) => {
  runCrawlers({
    onEach: list => {
      async.eachLimit(list, 10, (current, next) => {
        const hash = crypto
          .createHash("md5")
          .update(current.url)
          .digest("hex");

        const updateDate = moment(new Date()).format("YYYY-MM-DD");

        db(DOCUMENTS_TABLE)
          .where({ hash })
          .then(rows => {
            const isNew = rows.length === 0;
            if (isNew) {
              logger.info(`${current.sourceName} - #${hash} is new - fetching & parsing`);
              fetchAndParse({ url: current.url, hash }).then(parsedText => {
                logger.info(`${current.sourceName} - #${hash} downloaded & parsed `);
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
                    logger.info(`${current.sourceName} - #${hash} put into db`);
                    next(null);
                  });
              });
            } else {
              logger.info(`#${hash} exists - updating`);
              db(DOCUMENTS_TABLE)
                .where({ hash })
                .update({ ["last_download"]: updateDate })
                .then(() => {
                  logger.info(`${current.sourceName} - #${hash} updated in db`);
                  next(null);
                });
            }
          });
      });
    }
  });
};

(async () => {
  logger.info(`Fetcher started at ${new Date()}`);

  const db = await createDB();

  await processCrawlers({ db });

  await updateSubscriptions({ db });
})();
