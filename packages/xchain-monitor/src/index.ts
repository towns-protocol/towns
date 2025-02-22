import { createCustomPublicClient } from './client'
import { config } from './environment'
import { getLogger } from './logger'
import { scanBlockchainForXchainEvents } from './xchain'

const logger = getLogger('main')

async function main() {
    var blockOffset = config.initialBlockNum
    const publicClient = await createCustomPublicClient()
    var currentBlock = await publicClient.getBlockNumber()

    logger.info(
        {
            config,
            currentBlock,
        },
        'Starting xchain-monitor service',
    )

    while (true) {
        while (
            currentBlock <
            blockOffset + BigInt(config.blockScanChunkSize + config.transactionValidBlocks)
        ) {
            logger.info(
                {
                    currentBlock,
                    blockOffset,
                    blockScanChunkSize: config.blockScanChunkSize,
                    transactionValidBlocks: config.transactionValidBlocks,
                    waitingForBlocks:
                        blockOffset +
                        BigInt(config.blockScanChunkSize + config.transactionValidBlocks) -
                        currentBlock,
                },
                'Unable to proceed - waiting for chain to progress',
            )
            const waitMs = Math.min(config.blockScanChunkSize, 60) * 1000
            await new Promise((resolve) => setTimeout(resolve, waitMs))
            currentBlock = await publicClient.getBlockNumber()
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

void main()
