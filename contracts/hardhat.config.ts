import * as dotenv from 'dotenv'

import { HardhatUserConfig, task, subtask } from 'hardhat/config'
import 'hardhat-deploy'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import 'hardhat-gas-reporter'
import 'solidity-coverage'
import '@openzeppelin/hardhat-upgrades'
import 'hardhat-contract-sizer'
import 'hardhat-docgen'
import * as toml from 'toml'
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from 'hardhat/builtin-tasks/task-names'
import { readFileSync } from 'fs'

dotenv.config()

const SOLC_DEFAULT = '0.8.13'

// try use forge config
let foundry: any
try {
  foundry = toml.parse(readFileSync('./foundry.toml').toString())
  foundry.default.solc = foundry.default['solc-version']
    ? foundry.default['solc-version']
    : SOLC_DEFAULT
} catch (error) {
  foundry = {
    default: {
      solc: SOLC_DEFAULT,
    },
  }
}

// prune forge style tests from hardhat paths
subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS).setAction(
  async (_, __, runSuper) => {
    const paths = await runSuper()
    return paths.filter((p: string) => !p.endsWith('.t.sol'))
  },
)

task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  paths: {
    // Root is up one director to access monorepo node_modules
    // root: '..',
    cache: 'contracts/cache-hardhat',
    sources: './src',
    artifacts: './artifacts',
    tests: 'contracts/integration',
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  solidity: {
    version: foundry.default?.solc || SOLC_DEFAULT,
    // settings: {
    //   optimizer: {
    //     enabled: foundry.default?.optimizer || true,
    //     runs: foundry.default?.optimizer_runs || 200,
    //   },
    // },
  },
  networks: {
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/fb413fbb148a4a63b37698824d8d617a`,
      accounts:
        process.env.RINKEBY_PRIVATE_KEY !== undefined
          ? [process.env.RINKEBY_PRIVATE_KEY]
          : [],
    },
    ropsten: {
      url: process.env.ROPSTEN_URL || '',
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    arbitrumrinkeby: {
      url: 'https://rinkeby.arbitrum.io/rpc',
      accounts:
        process.env.ARB_RINKEBY_PRIVATE_KEY !== undefined
          ? [process.env.ARB_RINKEBY_PRIVATE_KEY]
          : [],
    },
    arbitrum: {
      url: 'https://arb1.arbitrum.io/rpc',
      accounts:
        process.env.ARB_PRIVATE_KEY !== undefined
          ? [process.env.ARB_PRIVATE_KEY]
          : [],
    },
    hardhat: {
      chainId: 1337,
      mining: {
        mempool: {
          order: 'fifo',
        },
        auto: true,
        interval: [3000, 6000],
      },
    },
    localhost: {
      chainId: 1337,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  contractSizer: {
    disambiguatePaths: false,
    runOnCompile: true,
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: true,
  },
}

export default config
