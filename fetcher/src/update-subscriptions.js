const moment = require("moment");
const async = require("async");
const changeCaseKeys = require("change-case-keys");
const { groupBy, template, flatten, pick } = require("lodash");
const fs = require("fs");
const path = require("path");

const SUBSCRIPTIONS_TABLE = "subscriptions";
const DOCUMENTS_TABLE = "documents";
const MAIN_URL = process.env.MAIN_URL || "http://localhost:8080/";
const EMAIL_TEMPLATE = fs.readFileSync(path.join(__dirname, "./notification-email.ejs"), { encoding: "utf8" });

const CONCURRENT_USERS = 10;
const CONCURRENT_PHRASES = 10;

const createEmail = template(EMAIL_TEMPLATE);

const processUserSubscriptions = ({ db, subscriptions }, callback) => {
  async.mapLimit(
    subscriptions,
    CONCURRENT_PHRASES,
    ({ searchPhrase, lastNotify, email }, callback) => {
      db(DOCUMENTS_TABLE)
        .select(["date", "title", "source_name"])
        .where("date", ">", lastNotify)
        .where(function() {
          this.where("content", "ilike", `%${searchPhrase}%`).orWhere("title", "ilike", `%${searchPhrase}%`);
        })
        .then(newDocument => {
          callback(null, {
            newDocument,
            searchPhrase,
            email,
            lastNotify
          });
        });
    },
    (err, results) => {
      const newResults = results.filter(({ newDocument }) => newDocument.length > 0);
      callback(err, newResults);
    }
  );
};

const createNotificationEmail = data => {
  return createEmail({
    data: data.map(d => Object.assign({ lastNotifyFormatted: moment(d.lastNotify).format("YYYY-MM-DD") }, d)),
    mainUrl: MAIN_URL
  });
};

const updateLastNotifyDates = ({ db, data }, callback) => {
  const notifyDate = moment().format("YYYY-MM-DD");

  async.map(
    flatten(data),
    (data, callback) => {
      const fields = pick(data, ["searchPhrase", "email"]);

      db(SUBSCRIPTIONS_TABLE)
        .where(changeCaseKeys(fields, "underscored"))
        .update(changeCaseKeys({ lastNotify: notifyDate }, "underscored"))
        .then(callback);
    },
    callback
  );
};

module.exports = async ({ db }) => {
  return new Promise((reject, resolve) => {
    db(SUBSCRIPTIONS_TABLE)
      .select(["email", "search_phrase", "last_notify"])
      .then(subscriptions => {
        const userSubscriptions = Object.entries(groupBy(subscriptions, "email")).map(
          ([_, userSubscriptions]) => userSubscriptions
        );

        async.mapLimit(
          userSubscriptions,
          CONCURRENT_USERS,
          (userSubscriptions, callback) => {
            const subscriptions = changeCaseKeys(userSubscriptions, "camelize");

            processUserSubscriptions({ db, subscriptions }, callback);
          },
          (err, results) => {
            if (err) {
              return reject(err);
            }

            if (!results || results.length === 0) {
              return resolve();
            }

            // TODO: actuall email the emails
            const notificationEmails = results.filter(data => data && data.length > 0).map(data => ({
              email: data[0].email,
              text: createNotificationEmail(data)
            }));

            updateLastNotifyDates({ db, data: results }, () => resolve());
          }
        );
      });
  });
};
