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
// const crawler = require("./crawlers/ulc.js");
// const crawler = require("./crawlers/cp.js");
// const crawler = require("./crawlers/ppiop.js");
// const crawler = require("./crawlers/men.js");
// const crawler = require("./crawlers/mgm.js");
// const crawler = require("./crawlers/eur-lex.js");
// const crawler = require("./crawlers/mfgov.js");
// const crawler = require("./crawlers/gddkia.js");
// const crawler = require("./crawlers/gdos.js");
// const crawler = require("./crawlers/uprp.js");
// const crawler = require("./crawlers/gios.js");
// const crawler = require("./crawlers/mi.js");
// const crawler = require("./crawlers/miir.js");
// const crawler = require("./crawlers/mon.js");
// const crawler = require("./crawlers/mpit.js");
// const crawler = require("./crawlers/minrol.js");
// const crawler = require("./crawlers/mr.js");
// const crawler = require("./crawlers/mfgov-2.js");
// const crawler = require("./crawlers/msp.js");
// const crawler = require("./crawlers/msport.js");
// const crawler = require("./crawlers/mswia.js");
// const crawler = require("./crawlers/msz.js");
// const crawler = require("./crawlers/gitd.js");
// const crawler = require("./crawlers/gus.js");
// const crawler = require("./crawlers/uokik.js");
const crawler = require("./crawlers/bulletin.js");

const fs = require("fs");

const test = async () => {
  const data = await crawler();
  console.log("result", JSON.stringify(data, null, 2));
  // fs.writeFileSync("./result.json", JSON.stringify(data, null, 2), "utf8");
};

test();
