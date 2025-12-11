module.exports = {
  ...require("../prettier-config/config.js"),
  plugins: ["prettier-plugin-solidity"],
  overrides: [
    {
      files: ["*.sol"],
      options: {
        printWidth: 100,
        tabWidth: 4,
      },
    },
  ],
};
