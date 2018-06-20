const crawler = require('./crawlers/1');
const crypto = require('crypto');

(async () => {
  const data = await crawler();
  const result = data.map(item => ({
    ...item,
    hash: crypto
      .createHash('md5')
      .update(item.url)
      .digest('hex')
  }));
  console.log('result', result);
})();
