const changeCaseKeys = require("change-case-keys");
const express = require("express");
const { pick, mapValues } = require("lodash");

const noMiddleware = (req, res, next) => next();

const toClient = obj => changeCaseKeys(obj, "camelize");
const toDB = obj => changeCaseKeys(obj, "underscored");

module.exports = ({ basePath, collection, authMiddleware = noMiddleware, fields, fieldFormatters = {}, db }) => {
  const router = express.Router();

  router.use(express.json());

  // private

  router.post(basePath, authMiddleware, (req, res) => {
    const toInsert = mapValues(pick(toDB(req.body), fields), (value, key) => {
      return fieldFormatters[key] ? fieldFormatters[key](value) : value;
    });

    db(collection)
      .insert(toDB(toInsert))
      .returning("id")
      .then(([id]) => {
        res.send({ ok: true, id });
      })
      .catch(err => {
        res.status(500).send(err);
      });
  });

  router.put(`${basePath}/:id`, authMiddleware, (req, res) => {
    console.log(req);
    const { id } = req.params;

    const toUpdate = mapValues(pick(req.body, fields), (value, key) => {
      return fieldFormatters[key] ? fieldFormatters[key](value) : value;
    });

    db(collection)
      .where({ id })
      .update(toDB(toUpdate))
      .then(() => {
        res.send({ ok: true });
      })
      .catch(err => {
        res.status(500).send(err);
      });
  });

  router.delete(`${basePath}/:id`, authMiddleware, (req, res) => {
    const { id } = req.params;

    db(collection)
      .where({ id })
      .delete()
      .then(() => {
        res.send({ ok: true });
      })
      .catch(err => {
        res.status(500).send(err);
      });
  });

  // public

  router.get(`${basePath}/:id`, (req, res) => {
    const { id } = req.params;

    db(collection)
      .where({ id })
      .select("*")
      .then(result => {
        res.send(toClient(result));
      })
      .catch(err => {
        res.status(500).send(err);
      });
  });

  router.get(`${basePath}/`, (req, res) => {
    db(collection)
      .select([...fields, "id"])
      .then(result => {
        res.send(toClient(result));
      })
      .catch(err => {
        res.status(500).send(err);
      });
  });

  return router;
};
