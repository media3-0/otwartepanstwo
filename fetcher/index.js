const cron = require("node-cron");

const fetcher = require("./src/index");

const IS_DEV = process.env.NODE_ENV === "development";

if (IS_DEV) {
  fetcher();
} else {
  cron.schedule("00 00 */1 * *", fetcher, { timezone: "Europe/Warsaw" });
}
