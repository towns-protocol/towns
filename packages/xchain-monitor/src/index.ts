import { createCustomPublicClient } from './client'
import { config } from './environment'
import { getLogger } from './logger'
import { scanBlockchainForXchainEvents } from './xchain'
import { saveLastScannedBlock, getFirstUnscannedBlock } from './currentBlock'

const logger = getLogger('main')

async function main() {
    var blockOffset = await getFirstUnscannedBlock()
    const publicClient = await createCustomPublicClient()
    var currentBlock = await publicClient.getBlockNumber()

    logger.info(
        {
            config,
            currentBlock,
        },
        'Starting xchain-monitor service',
    )

    while (
        currentBlock >
        blockOffset +
            BigInt(config.blockScanChunkSize + config.transactionValidBlocks)
    ) {
        const results = await scanBlockchainForXchainEvents(
            blockOffset,
            config.blockScanChunkSize,
        )
        currentBlock = await publicClient.getBlockNumber()
        const maxScannedBlock =
            blockOffset + BigInt(config.blockScanChunkSize - 1)
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
        await saveLastScannedBlock(blockOffset - 1n)
    }
    const maxScannedBlock = blockOffset - 1n
    logger.info(
        {
            currentBlock,
            maxScannedBlock,
            unscannedBlocks: currentBlock - maxScannedBlock,
            blockScanChunkSize: config.blockScanChunkSize,
            lookAheadBlocksNeeded: config.transactionValidBlocks,
        },
        'Monitor has caught up, shutting down.',
    )
}

void main()
