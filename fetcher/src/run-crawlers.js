const fs = require("fs");
const { fork } = require("child_process");
const async = require("async");
const path = require("path");
const j = require("joi");
const { EventEmitter } = require("events");
const moment = require("moment");

const logger = require("./logger");
const { parseEnvArray } = require("./utils");

const crawlersDir = `${__dirname}/crawlers`;
const MAX_TIME_BETWEEN_MSG = 10 * 60 * 1000;

const DATE_SCHEMA = j.string().regex(/[0-9]{4}[-]{1}[0-9]{2}[-]{1}[0-9]{2}/g);

const ENTITY_SCHEMA = j.object().keys({
  title: j.string().required(),
  sourceName: j.string().required(),
  url: j.string().required(),
  date: DATE_SCHEMA.required(),
  updateDate: DATE_SCHEMA,
  ocr: j.boolean()
});

// TODO: Test error handling
module.exports = () => {
  const emitter = new EventEmitter();

  const crawlersList = process.env.DEV_CRAWLERS ? parseEnvArray(process.env.DEV_CRAWLERS) : fs.readdirSync(crawlersDir);

  let intervalHandle;
  let lastUpdateTime;

  const setNewTimer = child => {
    if (intervalHandle) {
      clearInterval(intervalHandle);
    }

    lastUpdateTime = Date.now();

    intervalHandle = setInterval(() => {
      const now = Date.now();

      if (now - lastUpdateTime >= MAX_TIME_BETWEEN_MSG) {
        logger.error(`Process killed due to long time no response`, child);
        child.kill("SIGINT");
        clearInterval(intervalHandle);
      }
    }, 60 * 1000);
  };

  async.eachLimit(
    crawlersList,
    1,
    (crawlerFileName, callback) => {
      const crawlerPath = path.join(crawlersDir, "/", crawlerFileName);
      logger.info(`Running: ${crawlersDir}/${crawlerFileName}`);
      const child = fork("./src/spawn-crawler", [crawlerPath]);

      const startDate = Date.now();

      setNewTimer(child);

      child.on("error", err => {
        setNewTimer(child);
        logger.error(`Error in ${crawlerPath} - ${err}`);

        callback(null);
      });

      child.on("message", data => {
        setNewTimer(child);

        data.forEach(d => {
          j.validate(d, ENTITY_SCHEMA, err => {
            if (err) {
              logger.warn(`The crawled entity is not valid with the schema. Error: ${err}`, d);
            } else {
              emitter.emit("data", d);
            }
          });
        });
      });

      child.on("exit", () => {
        if (intervalHandle) {
          clearInterval(intervalHandle);
        }

        logger.info(
          `Finished: ${crawlersDir}/${crawlerFileName} at ${moment().toISOString()} in ${(Date.now() - startDate) /
            1000}`
        );

        callback(null);
      });
    },
    () => {
      emitter.emit("done");
    }
  );

  return emitter;
};
