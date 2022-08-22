import { HardhatUserConfig, subtask, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import "hardhat-deploy";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-preprocessor";

import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from "hardhat/builtin-tasks/task-names";

import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

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
    // paths.forEach((path: string) => {
    //   console.log(`path: ${path}`);
    // });
    return paths.filter((p: string) => !p.endsWith(".t.sol"));
  }
);

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
    alwaysGenerateOverloads: false,
  },

  paths: {
    root: "../../",
    sources: "./contracts/zion-governance/contracts",
    cache: "./contracts/zion-governance/cache_hardhat",
    artifacts: "./contracts/zion-governance/artifacts_hardhat",
    tests: "./contracts/zion-governance/test",
  },
};

export default config;
