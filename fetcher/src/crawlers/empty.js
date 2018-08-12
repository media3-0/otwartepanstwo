// for dev only

const { EventEmitter } = require("events");

module.exports = () => {
  const emitter = new EventEmitter();
  return emitter;
};
