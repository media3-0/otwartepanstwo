const express = require("express");
const app = express();

const PORT = process.env.PORT || 4000;

app.get("/health-check", (req, res) => {
  res.send("ok");
});

app.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
