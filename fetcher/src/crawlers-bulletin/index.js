const async = require("async");
const { EventEmitter } = require("events");
const crawl = require("../bulletin-crawler");

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter, "https://searchbzp.uzp.gov.pl/Search.aspx", "Biuletyn zamówień publicznych");
  return emitter;
};
