const crawlerPath = process.argv[2];

const crawler = require(crawlerPath);

const crawlProcess = crawler();

crawlProcess.on("entity", entity => {
  if (entity && process.send) {
    process.send(entity);
  }
});
