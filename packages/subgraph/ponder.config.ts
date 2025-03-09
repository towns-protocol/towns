import { createConfig } from 'ponder'
import { http, getAddress, hexToNumber } from 'viem'

import SpaceFactoryDeploy from '../../broadcast/DeploySpaceFactory.s.sol/31337/run-latest.json'

const address = getAddress(
    SpaceFactoryDeploy.transactions.find((t) => t.contractName === 'Diamond')!.contractAddress,
)
const startBlock = hexToNumber(SpaceFactoryDeploy.receipts[0]!.blockNumber as `0x${string}`)

// import abis
import { createSpaceFacetAbi } from '@river-build/contracts/typings'

export default createConfig({
    networks: {
        anvil: {
            chainId: 31337,
            transport: http(process.env.PONDER_RPC_URL_1),
            disableCache: true,
        },
    },
    contracts: {
        CreateSpace: {
            network: 'anvil',
            abi: createSpaceFacetAbi,
            address,
            startBlock,
        },
    },
})
