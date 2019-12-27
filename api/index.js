const express = require("express");
const jwksRsa = require("jwks-rsa");
const jwt = require("express-jwt");
const knex = require("knex");
const moment = require("moment");
const morgan = require("morgan");
const changeCaseKeys = require("change-case-keys");
const multer = require("multer");

const paginator = require("./knex-paginate");
const simpleCrud = require("./simple-crud");

const DOCUMENTS_TABLE = "documents";
const REGIONAL_DOCUMENTS_TABLE = "documents_regional";
const BULLETIN_DOCUMENTS_TABLE = "documents_bulletin";
const SUBSCRIPTIONS_TABLE = "subscriptions";
const PORT = process.env.PORT || 4000;

const toClient = obj => changeCaseKeys(obj, "camelize");
const toDB = obj => changeCaseKeys(obj, "underscored");

const upload = multer({ dest: "/data/uploads/" });

const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_CLIENTID,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ["RS256"]
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

  app.get("/health-check", (req, res) => {
    res.send("ok");
  });

  // articles
  app.use(
    simpleCrud({
      basePath: "/articles",
      collection: "articles",
      fields: ["title", "date", "content"],
      fieldFormatters: { date: value => moment(value).format("YYYY-MM-DD") },
      db,
      authMiddleware: checkJwt
    })
  );

  // keywords
  app.get("/regional/keywords", (req, res) => {
    db(REGIONAL_DOCUMENTS_TABLE)
      .distinct()
      .pluck("keywords")
      .then(sources => {
        res.json(toClient(sources));
      });
  });

  // publishers
  app.get("/regional/publishers", (req, res) => {
    db(REGIONAL_DOCUMENTS_TABLE)
      .distinct()
      .pluck("publisher")
      .then(sources => {
        res.json(toClient(sources));
      });
  });

  // source names
  const getSourceNames = db => (req, res) => {
    db.distinct()
      .pluck("source_name")
      .then(sources => {
        res.json(toClient(sources));
      });
  };

  app.get("/general/source-names", getSourceNames(db(DOCUMENTS_TABLE)));
  app.get("/regional/source-names", getSourceNames(db(REGIONAL_DOCUMENTS_TABLE)));

  // types
  const getTypes = db => (req, res) => {
    db.distinct()
      .pluck("type")
      .then(sources => {
        res.json(toClient(sources));
      });
  };

  // getMeta
  const getMeta = (db, fieldName) => (req, res) => {
    db.distinct()
      .pluck(fieldName)
      .then(sources => {
        res.json(toClient(sources));
      });
  };

  app.get("/general/type-names", getTypes(db(DOCUMENTS_TABLE)));
  app.get("/regional/type-names", getTypes(db(REGIONAL_DOCUMENTS_TABLE)));
  app.get("/bulletin/type-names", getTypes(db(BULLETIN_DOCUMENTS_TABLE)));
  app.get("/bulletin/orderer-names", getMeta(db(BULLETIN_DOCUMENTS_TABLE), "orderer_name"));
  app.get("/bulletin/orderer-locations", getMeta(db(BULLETIN_DOCUMENTS_TABLE), "orderer_location"));
  app.get("/bulletin/orderer-regions", getMeta(db(BULLETIN_DOCUMENTS_TABLE), "orderer_region"));

  // documents
  app.get("/general/documents/", (req, res) => {
    const { search, dateFrom, dateTo, sourceName, hash, page, perPage, sortBy, sortDirection, type } = req.query;
    const fields = ["title", "date", "last_download", "source_name", "hash", "url", "type"];

    let query = db(DOCUMENTS_TABLE).select(...fields);

    if (type) {
      query = query.where("type", "=", type);
    }

    if (hash) {
      query = query.where("hash", "=", hash);
    }

    if (dateFrom) {
      query = query.where("date", ">", dateFrom);
    }

    if (dateTo) {
      query = query.where("date", "<", dateTo);
    }

    if (sourceName) {
      query = query.where("source_name", "=", sourceName);
    }

    if (search) {
      query = query.where(db.raw(`content_lower LIKE '%${search}%'`));
    }

    if (sortBy) {
      query = query.orderBy(sortBy, sortDirection);
    }

    paginator(db, query, { page: page ? parseInt(page) : 1, perPage: perPage || 20 }).then(({ pagination, data }) =>
      res.json(
        toClient({
          page: pagination.currentPage,
          totalPages: pagination.lastPage,
          data
        })
      )
    );
  });

  // regional documents
  app.get("/regional/documents", (req, res) => {
    const {
      search,
      dateFrom,
      dateTo,
      sourceName,
      hash,
      page,
      perPage,
      sortBy,
      sortDirection,
      publisher,
      keywords
    } = req.query;
    const fields = ["title", "date", "last_download", "source_name", "hash", "url", "type", "publisher", "keywords"];

    let query = db(REGIONAL_DOCUMENTS_TABLE).select(...fields);

    console.log(keywords);

    if (keywords) {
      query = query.whereIn("keywords", [keywords]);
    }

    if (publisher) {
      query = query.where("publisher", "=", publisher);
    }

    if (hash) {
      query = query.where("hash", "=", hash);
    }

    if (dateFrom) {
      query = query.where("date", ">", dateFrom);
    }

    if (dateTo) {
      query = query.where("date", "<", dateTo);
    }

    if (sourceName) {
      query = query.where("source_name", "=", sourceName);
    }

    if (search) {
      query = query.where(db.raw(`content_lower LIKE '%${search}%'`));
    }

    if (sortBy) {
      query = query.orderBy(sortBy, sortDirection);
    }

    // console.log("query: ", query.toString())

    paginator(db, query, { page: page ? parseInt(page) : 1, perPage: perPage || 20 }).then(({ pagination, data }) =>
      res.json(
        toClient({
          page: pagination.currentPage,
          totalPages: pagination.lastPage,
          data
        })
      )
    );
  });

  // bulletin documents
  app.get("/bulletin/documents", (req, res) => {
    // const itemProps = [
    //   ["title"],
    //   ["type"],
    //   ["url"],
    //   ["source_name", "sourceName"],
    //   ["date"],
    //   ["orderer_name", "ordererName"],
    //   ["orderer_location", "ordererLocation"],
    //   ["orderer_region", "ordererRegion"],
    //   ["ref_num", "refNum"],
    //   ["content"]
    // ];
    const {
      search,
      dateFrom,
      dateTo,
      hash,
      page,
      perPage,
      sortBy,
      sortDirection,
      type,
      ordererName,
      ordererLocation,
      ordererRegion
    } = req.query;

    const fields = [
      "title",
      "date",
      "last_download",
      "source_name",
      "hash",
      "url",
      "type",
      "orderer_name",
      "orderer_location",
      "orderer_region",
      "ref_num"
    ];

    let query = db(BULLETIN_DOCUMENTS_TABLE).select(...fields);

    if (hash) {
      query = query.where("hash", "=", hash);
    }

    if (dateFrom) {
      query = query.where("date", ">", dateFrom);
    }

    if (dateTo) {
      query = query.where("date", "<", dateTo);
    }

    if (search) {
      query = query.where(db.raw(`content_lower LIKE '%${search}%'`));
    }

    if (sortBy) {
      query = query.orderBy(sortBy, sortDirection);
    }

    if (type) {
      query = query.where("type", "=", type);
    }

    if (ordererName) {
      query = query.where("orderer_name", "=", ordererName);
    }

    if (ordererLocation) {
      query = query.where("orderer_location", "=", ordererLocation);
    }

    if (ordererRegion) {
      query = query.where("orderer_region", "=", ordererRegion);
    }

    // console.log("query: ", query.toString())

    paginator(db, query, { page: page ? parseInt(page) : 1, perPage: perPage || 20 }).then(({ pagination, data }) =>
      res.json(
        toClient({
          page: pagination.currentPage,
          totalPages: pagination.lastPage,
          data
        })
      )
    );
  });

  // subscriptions (protected api)
  app.get("/subscriptions", checkJwt, (req, res) => {
    const { email } = req.user;

    if (!email) {
      return res.status(400).send({ reason: "`email` missing" });
    }

    db(SUBSCRIPTIONS_TABLE)
      .select()
      .where({ email })
      .then(subscriptions => {
        res.json(toClient(subscriptions));
      });
  });

  app.post("/subscriptions", checkJwt, (req, res) => {
    const { email } = req.user;
    const { search, documentSource } = req.body;

    if (!email) {
      return res.status(400).send({ reason: "`email` missing" });
    }

    if (!search && !documentSource) {
      return res.status(400).send({ reason: "`search` and `documentSource` missing" });
    }

    db(SUBSCRIPTIONS_TABLE)
      .insert(
        toDB({
          email,
          searchPhrase: search,
          documentSource,
          lastNotify: moment().format("YYYY-MM-DD")
        })
      )
      .then(() => {
        res.send({ ok: true });
      });
  });

  app.delete("/subscriptions", checkJwt, (req, res) => {
    const { email } = req.user;
    const { search, documentSource } = req.body;

    if (!email) {
      return res.status(400).send({ reason: "`email` missing" });
    }

    if (!search && !documentSource) {
      return res.status(400).send({ reason: "`search` and `documentSource` missing" });
    }

    db(SUBSCRIPTIONS_TABLE)
      .where(
        search
          ? toDB({
              email,
              searchPhrase: search
            })
          : toDB({
              email,
              documentSource
            })
      )
      .del()
      .then(() => {
        res.send({ ok: true });
      });
  });

  // uploads
  app.post("/upload", upload.single("asset"), (req, res) => {
    res.send({ filePath: `/uploads/${req.file.filename}` });
  });

  // start
  app.listen(PORT, () => {
    console.log(`listening on ${PORT}`);
  });
};

init();
