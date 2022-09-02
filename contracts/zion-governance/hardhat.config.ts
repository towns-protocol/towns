import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-ethers";
import "hardhat-packager";
import "hardhat-preprocessor";
import "hardhat-deploy";
import "solidity-docgen";

import path from "path";
import fs from "fs";

import { HardhatUserConfig, subtask } from "hardhat/config";
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from "hardhat/builtin-tasks/task-names";

import * as dotenv from "dotenv";
dotenv.config();

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
    const paths: string[] = await runSuper();
    return paths.filter((p) => !p.endsWith(".t.sol") && !p.includes("test"));
  },
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
    outDir: "./contracts/zion-governance/src",
    target: "ethers-v5",
    alwaysGenerateOverloads: false,
  },

  packager: {
    contracts: ["CouncilNFT", "CouncilStaking", "ZionSpaceManager"],
    includeFactories: true,
  },

  paths: {
    root: "../../",
    sources: "./contracts/zion-governance/contracts",
    cache: "./contracts/zion-governance/cache_hardhat",
    artifacts: "./contracts/zion-governance/dist/artifacts",
    tests: "./contracts/zion-governance/test",
  },
  docgen: {
    outputDir: "./contracts/zion-governance/docs",
    pages: "items",
    exclude: ["governance"],
  },
};

export default config;
