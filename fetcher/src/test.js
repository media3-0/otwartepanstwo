const runCrawlers = require("./run-crawlers");

runCrawlers().on("data", item => console.log(item));
