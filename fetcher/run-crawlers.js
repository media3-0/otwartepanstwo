const fs = require("fs");
const { fork } = require("child_process");
const async = require("async");
const flatten = require("lodash.flatten");

const crawlersDir = "./crawlers";

// TODO: Test error handling
module.exports = async list => {
  const crawlersList = list || fs.readdirSync(crawlersDir);

  return new Promise((resolve, reject) => {
    async.mapSeries(
      crawlersList,
      (crawlerFileName, callback) => {
        const child = fork("./spawn-crawler", [`${crawlersDir}/${crawlerFileName}`]);
        process.on("error", err => {
          callback(err);
        });
        child.on("message", data => {
          callback(null, data);
        });
      },
      (err, results) => {
        if (err) {
          console.error("Error in runCrawlers ", err);
        }
        resolve(flatten(results));
      }
    );
  });
};
