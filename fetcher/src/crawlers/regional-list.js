const async = require("async");
const { EventEmitter } = require("events");
const crawl = require("../regional-crawler");

const regionalList = [
  { url: "http://edzienniki.duw.pl/duw/", name: "Dziennik Urzędowy Województwa Dolnośląskiego" },
  {
    url: "http://www.edzienniki.bydgoszcz.uw.gov.pl/",
    name: "Dziennik Urzędowy Województwa Kujawsko-Pomorskiego"
  },
  {
    url: "http://edziennik.lublin.uw.gov.pl/",
    name: "Dziennik Urzędowy Województwa Lubelskiego"
  },
  {
    url: "http://dzienniki.luw.pl/",
    name: "Dziennik Urzędowy Województwa Lubuskiego"
  },
  {
    url: "http://dziennik.lodzkie.eu/",
    name: "Dziennik Urzędowy Województwa Łódzkiego"
  },
  {
    url: "http://edziennik.malopolska.uw.gov.pl/",
    name: "Dziennik Urzędowy Województwa Małopolskiego"
  },
  {
    url: "http://edziennik.mazowieckie.pl/",
    name: "Dziennik Urzędowy Województwa Mazowieckiego"
  },
  {
    url: "http://duwo.opole.uw.gov.pl/",
    name: "Dziennik Urzędowy Województwa Opolskiego"
  },
  {
    url: "http://edziennik.rzeszow.uw.gov.pl/",
    name: "Dziennik Urzędowy Województwa Podkarpackiego",
    mainURLFix: "#/actbymonths"
  },
  {
    url: "http://edziennik.bialystok.uw.gov.pl/",
    name: "Dziennik Urzędowy Województwa Podlaskiego"
  },
  {
    url: "http://edziennik.gdansk.uw.gov.pl/",
    name: "Dziennik Urzędowy Województwa Pomorskiego"
  },
  {
    url: "http://dzienniki.slask.eu/",
    name: "Dziennik Urzędowy Województwa Śląskiego"
  },
  {
    url: "http://edziennik.kielce.uw.gov.pl/",
    name: "Dziennik Urzędowy Województwa Świętokrzyskiego"
  },
  {
    url: "http://edziennik.poznan.uw.gov.pl/",
    name: "Dziennik Urzędowy Województwa Wielkopolskiego"
  },
  {
    url: "http://e-dziennik.szczecin.uw.gov.pl/",
    name: "Dziennik Urzędowy Województwa Zachodniopomorskiego"
  }
];

module.exports = () => {
  const emitter = new EventEmitter();
  async.mapLimit(regionalList, 1, async current => {
    await crawl(emitter, current.url, current.name, current.mainURLFix || "");
  });
  return emitter;
};
