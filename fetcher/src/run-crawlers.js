const CHILD_MAX_LIFETIME = 30 * 1000 * 60;

const fs = require("fs");
const { fork } = require("child_process");
const async = require("async");
const { flatten } = require("lodash");
const path = require("path");

const logger = require("./logger");
const { parseEnvArray } = require("./utils");

const crawlersDir = `${__dirname}/crawlers`;

// TODO: Test error handling
module.exports = async ({ onEach }) => {
  const crawlersList = process.env.DEV_CRAWLERS ? parseEnvArray(process.env.DEV_CRAWLERS) : fs.readdirSync(crawlersDir);

  return new Promise((resolve, reject) => {
    async.mapSeries(
      crawlersList,
      (crawlerFileName, callback) => {
        logger.info(`running ${crawlersDir}/${crawlerFileName}`);
        const child = fork("./src/spawn-crawler", [path.join(crawlersDir, "/", crawlerFileName)]);

        child.on("error", err => {
          callback(err);
        });

        child.on("message", data => {
          onEach(data);
          callback(null, data);
        });

        // Kill if process takes longer than CHILD_MAX_LIFETIME
        setTimeout(() => {
          child.kill("SIGINT");
        }, CHILD_MAX_LIFETIME);
      },
      (err, results) => {
        if (err) {
          logger.error(`Error in runCrawlers ${err}`);
          return reject(err);
        }

        resolve(flatten(results));
      }
    );
  });
};
