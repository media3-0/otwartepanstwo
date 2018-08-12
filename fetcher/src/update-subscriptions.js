const async = require("async");
const changeCaseKeys = require("change-case-keys");
const fs = require("fs");
const mailgunTransport = require("nodemailer-mailgun-transport");
const moment = require("moment");
const nodemailer = require("nodemailer");
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
    ({ searchPhrase, lastNotify, email }, callback) => {
      db(DOCUMENTS_TABLE)
        .select(["date", "title", "source_name"])
        .where("date", ">", lastNotify)
        .where(knex.raw(`LOWER(title  || ' ' || content) LIKE LOWER('%${searchPhrase}%')`))
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

const sendEmails = ({ emails, nodemailer }, callback) => {
  async.mapLimit(emails, 2, ({ email, text }) => {
    nodemailer.sendMail(
      {
        from: "OtwartePaństwo",
        to: email,
        subject: "Powiadomienie",
        text
      },
      callback
    );
  });
};

module.exports = async ({ db }) => {
  const nodemailerMailgun = nodemailer.createTransport(
    mailgunTransport({
      auth: {
        ["api_key"]: process.env.MAILGUN_API_KEY
        // domain: process.env.MAILGUN_DOMAIN
      }
    })
  );

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

            const emails = results.filter(data => data && data.length > 0).map(data => ({
              email: data[0].email,
              text: createNotificationEmail(data)
            }));

            sendEmails({ emails, nodemailer: nodemailerMailgun }, () => {
              updateLastNotifyDates({ db, data: results }, () => resolve());
            });
          }
        );
      });
  });
};
