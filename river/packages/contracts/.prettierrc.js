module.exports = {
  ...require("@towns-protocol/prettier-config"),
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
