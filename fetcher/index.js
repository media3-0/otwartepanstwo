const knex = require("knex");
const IS_DEV = process.env.NODE_ENV === "development";

const createDB = callback => {
  const connection = `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@db:5432/postgres`;

  const db = knex({
    client: "pg",
    connection
  });

  // console.log(db);

  // test connection and callback if ok
  db
    .raw("select 1 + 1 as result")
    .then(() => callback(null, db))
    .catch(e => callback(e));
};

createDB((err, db) => {
  console.log("!!!!");

  db("exports")
    .insert({ hash: "IOJJIHIHI" })
    .returning("hash")
    .then(d => console.log("D", d, process.env.POSTGRES_USER, process.env.POSTGRES_PASSWORD));

  db("exports")
    .select()
    .then(d => console.log("all d", d));
});
