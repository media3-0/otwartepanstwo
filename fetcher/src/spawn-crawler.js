const crawlerPath = process.argv[2];

const crawler = require(crawlerPath);

(async () => {
  const data = await crawler();
  const filteredData = data.filter(item => !!item.url && !!item.date && item.url.endsWith(".pdf"));

  if (process.send) {
    process.send(filteredData);
  }
})();
