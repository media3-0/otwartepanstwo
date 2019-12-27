const j = require("joi");

const DATE_SCHEMA = j.string().regex(/^[1-9]{1}[0-9]{3}[-]{1}[0-9]{2}[-]{1}[0-9]{2}$/g);

const STANDARD_ENTITY_SCHEMA = j.object().keys({
  title: j.string().required(),
  type: j.string(),
  sourceName: j.string().required(),
  url: j.string().required(),
  date: DATE_SCHEMA.required(),
  updateDate: DATE_SCHEMA,
  ocr: j.boolean()
});

const REGIONAL_ENTITY_SCHEMA = j.object().keys({
  title: j.string().required(),
  type: j.string(),
  sourceName: j.string().required(),
  url: j.string().required(),
  date: DATE_SCHEMA.required(),
  updateDate: DATE_SCHEMA,
  ocr: j.boolean(),
  publisher: j.string(),
  keywords: j.array()
});

const BULLETIN_ENTITY_SCHEMA = j.object().keys({
  title: j.string().required(),
  type: j.string(),
  sourceName: j.string().required(),
  url: j.string().required(),
  date: DATE_SCHEMA.required(),
  updateDate: DATE_SCHEMA,
  ocr: j.boolean(),
  ordererName: j.string(),
  ordererLocation: j.string(),
  ordererRegion: j.string(),
  orderName: j.string(),
  refNum: j.string(),
  content: j.string()
});

module.exports = {
  DATE_SCHEMA,
  STANDARD_ENTITY_SCHEMA,
  REGIONAL_ENTITY_SCHEMA,
  BULLETIN_ENTITY_SCHEMA
};
