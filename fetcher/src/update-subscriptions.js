const async = require("async");
const changeCaseKeys = require("change-case-keys");
const fs = require("fs");
const mailgun = require("mailgun-js");
const moment = require("moment");
const path = require("path");
const { groupBy, template, flatten, pick } = require("lodash");

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
    ({ searchPhrase, documentSource, lastNotify, email }, callback) => {
      db(DOCUMENTS_TABLE)
        .select(["date", "title", "source_name"])
        .where("date", ">", lastNotify)
        .where(db.raw(`content_lower LIKE '%${searchPhrase}%' or source_name = '${documentSource}'`))
        .then(newDocument => {
          callback(null, {
            newDocument,
            searchPhrase,
            documentSource,
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
      const fields = pick(data, ["searchPhrase", "documentSource", "email"]);

      db(SUBSCRIPTIONS_TABLE)
        .where(changeCaseKeys(fields, "underscored"))
        .update(changeCaseKeys({ lastNotify: notifyDate }, "underscored"))
        .then(callback);
    },
    callback
  );
};

const sendEmails = ({ emails, mg }, callback) => {
  async.mapLimit(emails, 2, ({ email, text }) => {
    mg.messages().send(
      {
        from: "noreply@otwartepanstwo.pl",
        to: email,
        subject: "Powiadomienie",
        text
      },
      callback
    );
  });
};

module.exports = async ({ db }) => {
  const config = {
    host: "api.eu.mailgun.net",
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN
  };

  const mg = mailgun(config);

  return new Promise((resolve, reject) => {
    db(SUBSCRIPTIONS_TABLE)
      .select(["email", "search_phrase", "document_source", "last_notify"])
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

            if (!results || flatten(results).length === 0) {
              return resolve();
            }

            const emails = results.filter(data => data && data.length > 0).map(data => ({
              email: data[0].email,
              text: createNotificationEmail(data)
            }));

            sendEmails({ emails, mg }, err => {
              if (err) {
                console.log("mailgun error", err);
              } else {
                updateLastNotifyDates({ db, data: results }, () => resolve());
              }
            });
          }
        );
      });
  });
};
