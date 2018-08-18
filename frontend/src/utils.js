const { format } = require("date-fns");

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

module.exports = { buildPdfUrl, formatDate, allIndexOf, removeNullKeys };
