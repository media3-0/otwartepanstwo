const cron = require("node-cron");

const fetcher = require("./src/index");

const IS_DEV = process.env.NODE_ENV === "development";

if (IS_DEV) {
  fetcher();
} else {
  cron.schedule({
    cronTime: "00 00 */1 * *",
    onTick: function() {
      fetcher();
    },
    start: false,
    timezone: "Europe/Warsaw"
  });
}
