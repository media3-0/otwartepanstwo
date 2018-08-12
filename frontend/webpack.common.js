const path = require("path");
const webpack = require("webpack");

const DIST = path.resolve(__dirname, "dist");
const IS_DEV = process.env.NODE_ENV === "development";

module.exports = {
  mode: IS_DEV ? "development" : "production",

  entry: "./src/index",

  output: {
    path: DIST,
    publicPath: "/",
    filename: "bundle.js"
  },

  plugins: [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
      "process.env.AUTH0_CLIENTID": JSON.stringify(process.env.AUTH0_CLIENTID),
      "process.env.AUTH0_REDIRECT": JSON.stringify(process.env.AUTH0_REDIRECT)
    })
  ],

  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
        loader: "url-loader"
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader"
      }
    ]
  }
};
