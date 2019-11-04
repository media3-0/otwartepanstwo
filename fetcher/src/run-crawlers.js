const { fork } = require("child_process");
const async = require("async");
const j = require("joi");
const { EventEmitter } = require("events");
const moment = require("moment");

const logger = require("./logger");

const MAX_TIME_BETWEEN_MSG = 10 * 60 * 1000;

// TODO: Test error handling
module.exports = ({ crawlersUrls, entitySchema }) => () => {
  const emitter = new EventEmitter();

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
    crawlersUrls,
    1,
    ({ url }, callback) => {
      logger.info(`Running: ${url}`);
      const child = fork("./src/spawn-crawler", [url]);

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
          j.validate(d, entitySchema, err => {
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

        logger.info(`Finished: ${url} at ${moment().toISOString()} in ${(Date.now() - startDate) / 1000}`);

        callback(null);
      });
    },
    () => {
      emitter.emit("done");
    }
  );

  return emitter;
};
