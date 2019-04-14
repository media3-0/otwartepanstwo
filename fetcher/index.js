const CronJob = require("cron").CronJob;

const fetcher = require("./src/index");

const IS_DEV = process.env.NODE_ENV === "development";

const job = new CronJob({
  cronTime: "00 00 */1 * *",
  onTick: function() {
    fetcher();
  },
  start: false,
  timezone: "Europe/Warsaw"
});

IS_DEV ? fetcher() : job.start();
