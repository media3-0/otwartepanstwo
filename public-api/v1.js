const changeCaseKeys = require("change-case-keys");
const rateLimit = require("express-rate-limit");
const { Router } = require("express");

const paginator = require("./knex-paginate");

const toClient = obj => changeCaseKeys(obj, "camelize");

const DOCUMENTS_TABLE = "documents";

module.exports = ({ db }) => {
  const router = Router();

  router.use(rateLimit({ windowMs: 10 * 60 * 1000, max: 100 }));

  /**
   * @swagger
   * /v1/sources:
   *    get:
   *      description: Lista dostępnych źródeł
   *      responses:
   *        '200':
   *          description: Tablica JSON dostępnych źródeł
   */
  router.get("/sources", (req, res) => {
    db(DOCUMENTS_TABLE)
      .distinct()
      .pluck("source_name")
      .then(sources => res.json(toClient(sources)));
  });

  /**
   * @swagger
   * /v1/documents:
   *    get:
   *      description: Wyszukiwarka dostępnych dokumentów
   *      parameters:
   *        - in: query
   *          name: search
   *          type: string
   *        - in: query
   *          name: dateFrom
   *          type: string
   *          description: Data w formacie DDMMYYYY
   *        - in: query
   *          name: dateTo
   *          type: string
   *          description: Data w formacie DDMMYYYY
   *        - in: query
   *          name: sourceName
   *          type: string
   *          description: Nazwa źródła (dostępne w /v1/sources)
   *        - in: query
   *          name: page
   *          type: int
   *          description: Numer strony paginacji
   *        - in: query
   *          name: perPage
   *          description: Liczba dokumentów zwracanych w stronie
   *          minimum: 1
   *          maximum: 100
   *          default: 20
   *        - in: query
   *          name: sortBy
   *          type: string
   *          description: Sortowanie wg. zadanego klucza
   *          default: source_name
   *        - in: query
   *          name: sortDirection
   *          type: string
   *          description: Sposób sortowania
   *          enum:
   *            - ASC
   *            - DESC
   *      responses:
   *        '200':
   *          description: Lista znalezionych dokumentów
   */
  router.get("/documents/", (req, res) => {
    const { search, dateFrom, dateTo, sourceName, hash, page, perPage, sortBy, sortDirection } = req.query;
    const fields = ["title", "date", "last_download", "source_name", "hash", "url"];

    let query = db(DOCUMENTS_TABLE).select(...fields);

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

    paginator(db, query, { page: page ? parseInt(page) : 1, perPage: Math.max(1, Math.min(perPage || 20, 100)) }).then(
      ({ pagination, data }) =>
        res.json(
          toClient({
            page: pagination.currentPage,
            totalPages: pagination.lastPage,
            data
          })
        )
    );
  });

  return router;
};
