const Crawler = require('crawler');

const c = new Crawler({
  maxConnections: 10,
  callback: (error, res, done) => {
    if (error) {
      console.error(error);
    } else {
      const $ = res.$;
      console.log($('title').text());
    }
  }
});

c.queue('http://www.dziennikustaw.gov.pl');
