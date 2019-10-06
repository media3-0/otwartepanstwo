const express = require("express");
const knex = require("knex");
const morgan = require("morgan");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const PORT = process.env.PORT || 5000;

const createV1 = require("./v1");

const specs = swaggerJsdoc({
  swaggerDefinition: {
    info: {
      title: "OtwartePaństwo API",
      description: "API jest limitowane do 100 zapytań w ciągu 10 minut z tego samego hosta.",
      version: "1.0.0"
    },
    basePath: "/public-api/"
  },
  apis: ["v1.js"]
});

const createDB = () =>
  new Promise((resolve, reject) => {
    const db = knex({
      client: "pg",
      connection: {
        host: "db",
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD
      }
    });

    // test connection and callback if ok
    db.raw("select 1 + 1 as result")
      .then(() => resolve(db))
      .catch(e => reject(e));
  });

const init = async () => {
  const app = express();
  const db = await createDB();

  // setup
  app.use(morgan("combined"));
  app.use(express.json());
  app.set("trust proxy", 1); // needed for express-rate-limit

  // v1 api
  app.use("/v1", createV1({ db }));

  // docs
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));

  app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
  });
};

init();
