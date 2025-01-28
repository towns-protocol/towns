import { createCustomPublicClient } from './client'
import { config } from './environment'
import { getLogger } from './logger'
import { scanBlockchainForXchainEvents } from './xchain'

const logger = getLogger('main')

async function main() {
    var blockOffset = config.initialBlockNum

    const publicClient = await createCustomPublicClient()
    var currentBlock = await publicClient.getBlockNumber()
    while (true) {
        if (
            currentBlock <
            blockOffset + BigInt(config.blockScanChunkSize + config.transactionValidBlocks)
        ) {
            break
        }
        const results = await scanBlockchainForXchainEvents(blockOffset, config.blockScanChunkSize)
        currentBlock = await publicClient.getBlockNumber()
        const maxScannedBlock = blockOffset + BigInt(config.blockScanChunkSize - 1)
        logger.info(
            {
                blockOffset,
                maxScannedBlock,
                currentBlock,
                blockScanChunkSize: config.blockScanChunkSize,
                remainingUnscannedBlocks: currentBlock - maxScannedBlock,
                results,
            },
            'Scanned blocks',
        )
        for (const result of results) {
            if (result.checkResult === undefined) {
                logger.error(
                    {
                        result,
                    },
                    'Unterminated check request detected',
                )
            }
        }
        blockOffset += BigInt(config.blockScanChunkSize)
    }
}

await main()
