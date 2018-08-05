const CHILD_MAX_LIFETIME = 30 * 1000 * 60;

const fs = require("fs");
const { fork } = require("child_process");
const async = require("async");
const flatten = require("lodash.flatten");

const crawlersDir = `${__dirname}/crawlers`;

// TODO: Test error handling
module.exports = async list => {
  const crawlersList = list || fs.readdirSync(crawlersDir);

  return new Promise((resolve, reject) => {
    async.mapSeries(
      crawlersList,
      (crawlerFileName, callback) => {
        console.log(`running ${crawlersDir}/${crawlerFileName}`);
        const child = fork("./src/spawn-crawler", [`${crawlersDir}/${crawlerFileName}`]);

        child.on("error", err => {
          callback(err);
        });

        child.on("message", data => {
          callback(null, data);
        });

        // Kill if process takes longer than CHILD_MAX_LIFETIME
        setTimeout(() => {
          child.kill("SIGINT");
        }, CHILD_MAX_LIFETIME);
      },
      (err, results) => {
        if (err) {
          console.error("Error in runCrawlers ", err);
          return reject(err);
        }

        resolve(flatten(results));
      }
    );
  });
};
