// const crawler = require("./crawlers/dziennik-ustaw.js");
// const crawler = require("./crawlers/monitor-polski.js");
// const crawler = require("./crawlers/ppiop.js");
// const crawler = require("./crawlers/dziennik-ustaw-na-uchodzctwie.js");
// const crawler = require("./crawlers/abw.js");
// const crawler = require("./crawlers/cba.js");
// const crawler = require("./crawlers/policja.js");
// const crawler = require("./crawlers/strazgraniczna.js");
// const crawler = require("./crawlers/knf.js");
// const crawler = require("./crawlers/nbp.js");
// const crawler = require("./crawlers/uke.js");
const crawler = require("./crawlers/ulc.js");

const fs = require("fs");

const test = async () => {
  const data = await crawler();
  console.log("result", JSON.stringify(data, null, 2));
  // fs.writeFileSync("./result.json", JSON.stringify(data, null, 2), "utf8");
};

test();
