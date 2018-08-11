const runCrawlers = require("./run-crawlers");

runCrawlers({
  onEach: list => {
    console.log(list);
  }
});
