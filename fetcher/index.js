const IS_DEV = process.env.NODE_ENV === "development";

const fs = require("fs");
const async = require("async");
const crypto = require("crypto");
const knex = require("knex");
const pdfExtractor = require("pdf-text-extract");

const runCrawlers = require("./run-crawlers");

const PDFS_TABLE_NAME = "documents";

const createDB = () =>
  new Promise((resolve, reject) => {
    const connection = `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@db:5432/postgres`;

    const db = knex({
      client: "pg",
      connection
    });

    // test connection and callback if ok
    db
      .raw("select 1 + 1 as result")
      .then(() => resolve(db))
      .catch(e => reject(e));
  });

const addToDb = () => {
  const file = fs.createWriteStream(`./files/${current.hash}.pdf`);
  http.get(current.url, response => {
    response.pipe(file);
    file.on("finish", () => {
      file.close(() => {
        readOneFile(`./files/${current.hash}.pdf`, parsedText => {});
      });
    });
  });
};

(async () => {
  const [db, crawledData] = await Promise.all([createDB(), runCrawlers()]);
  console.log('data!', crawledData);

  async.eachLimit(crawledData, 10, current => {
    const hash = crypto
      .createHash("md5")
      .update(current.url)
      .digest("hex");
    const isNew = knex(PDFS_TABLE_NAME).where({ hash }).then(rows => console.log(rows));
  });
})();

// createDB((err, db) => {
//   console.log("!!!!");

//   db("exports")
//     .insert({ hash: "IOJJIHIHI" })
//     .returning("hash")
//     .then(d => console.log("D", d, process.env.POSTGRES_USER, process.env.POSTGRES_PASSWORD));

//   db("exports")
//     .select()
//     .then(d => console.log("all d", d));

//   pdfExtractor("/data/files/1.pdf", { splitPages: false, layout: "raw" }, (err, content) => {
//     if (err) {
//       console.log("error from PDF PARSER", err);
//     } else {
//       console.log("done");
//       fs.writeFileSync("/data/files/1.txt", content);
//     }
//   });
// });
