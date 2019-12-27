const { EventEmitter } = require("events");
const crawl = require("../bulletin-crawler");

module.exports = () => {
  const emitter = new EventEmitter();
  crawl(emitter, "Biuletyn zamówień publicznych");
  return emitter;
};
