import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

import { HardhatUserConfig, subtask, task } from "hardhat/config";
import "hardhat-deploy";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-preprocessor";
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from "hardhat/builtin-tasks/task-names";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();
  let a = 0;
  for (const account of accounts) {
    if (a < 2) {
      a++;
      console.log(account.address);
    }
  }
});

function getRemappings() {
  let mappings = path.join("../../", "remappings.txt");

  return fs
    .readFileSync(mappings, "utf8")
    .split("\n")
    .filter(Boolean) // remove empty lines
    .filter((line) => !line.includes("node_modules"))
    .map((line) => line.trim().split("="));
}

// prune forge style tests from hardhat paths
subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS).setAction(
  async (_, __, runSuper) => {
    const paths = await runSuper();
    paths.forEach((path: string) => {
      console.log(`path: ${path}`);
    });
    return paths.filter((p: string) => !p.endsWith(".t.sol"));
  }
);

// subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS, async (_, { config }) => {
//   const mainContracts = await glob(
//     path.join(config.paths.root, "contracts/**/*.sol")
//   );
//   const testContracts = await glob(
//     path.join(config.paths.root, "test/**/*.sol")
//   );
//   // and so on

//   return [
//     ...mainContracts,
//     ...testContracts,
//     // and so on
//   ].map(path.normalize); // not sure if normalize is needed here
// });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.13",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  networks: {
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    hardhat: {
      chainId: 1337,
      gas: 6721975,
      gasPrice: 8000000000,
    },
    localhost: {
      chainId: 1337,
      gas: 6721975,
      gasPrice: 8000000000,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  preprocess: {
    eachLine: (hre) => ({
      transform: (line: string) => {
        if (line.match(/^\s*import /i)) {
          getRemappings().forEach(([find, replace]) => {
            if (line.match(find)) {
              line = line.replace(find, replace);
            }
          });
        }
        return line;
      },
    }),
  },
  typechain: {
    outDir: "./contracts/zion-governance/typechain-types",
    target: "ethers-v5",
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
  },

  paths: {
    root: "../../",
    sources: "./contracts/zion-governance/contracts",
    cache: "./contracts/zion-governance/cache_hardhat",
    artifacts: "./contracts/zion-governance/artifacts_hardhat",
  },
};

export default config;
