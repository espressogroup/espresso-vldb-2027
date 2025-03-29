const path = require("path");
module.exports = {
  mode: "development",
  entry: "./src/test.js.TRUE",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "test.js.TRUE",
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [{ loader: "style-loader" }, { loader: "css-loader" }],
      },
    ],
  },
  devServer: {
    static: "./dist",
    port: 7070,
  },
};
