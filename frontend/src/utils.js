const { format } = require("date-fns");
const { uniq, mapValues, groupBy } = require("lodash");
const moment = require("moment");

const buildPdfUrl = hash => `/files/${hash}.pdf`;

const formatDate = str => format(new Date(str), "DD.MM.YYYY");

// const getIndicesOf = (searchStr, str, caseSensitive) => {
//   const searchStrLen = searchStr.length;
//   if (searchStrLen == 0) {
//     return [];
//   }
//   let stardIndex = 0;
//   let index;
//   let indices = [];

//   if (!caseSensitive) {
//     str = str.toLowerCase();
//     searchStr = searchStr.toLowerCase();
//   }

//   while ((index = str.indexOf(searchStr, startIndex)) > -1) {
//     indices.push(index);
//     startIndex = index + searchStrLen;
//   }
//   return indices;
// };

const allIndexOf = (str, toSearch) => {
  let indices = [];
  for (var pos = str.indexOf(toSearch); pos !== -1; pos = str.indexOf(toSearch, pos + 1)) {
    indices.push(pos);
  }
  return indices;
};

const removeNullKeys = collection =>
  Object.keys(collection).reduce((acc, key) => {
    const value = collection[key];
    if (!value) {
      return acc;
    }
    return Object.assign({}, acc, { [key]: value });
  }, {});

moment.locale("pl");

const getUniqueMonths = list =>
  mapValues(groupBy(list, d => d.slice(0, 4)), yearCollection => {
    return uniq(yearCollection.map(d => parseInt(d.slice(5, 7))).sort()).map(monthNum => {
      return {
        name: moment()
          .month(monthNum - 1)
          .format("MMMM"),
        num: monthNum
      };
    });
  });

module.exports = {
  buildPdfUrl,
  formatDate,
  allIndexOf,
  removeNullKeys,
  getUniqueMonths
};
