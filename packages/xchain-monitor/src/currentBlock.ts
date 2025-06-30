import fs from 'fs'
import path from 'path'
import { config } from './environment'
import { getLogger } from './logger'

const logger = getLogger('currentBlock')

export async function saveLastScannedBlock(blockNum: bigint) {
    if (!config.persistentStorageDir) {
        return
    }
    const fileName = path.join(config.persistentStorageDir, 'currentBlock')
    try {
        await fs.promises.writeFile(fileName, `${blockNum + 1n}`, 'utf8')
        logger.info(
            {
                fileName,
                lastScannedBlock: blockNum,
            },
            'Saving last scanned block to file',
        )
    } catch (err) {
        logger.error(
            {
                fileName,
                err,
            },
            'Unable to write current block number to file',
        )
    }
}

export async function getFirstUnscannedBlock(): Promise<bigint> {
    if (!config.persistentStorageDir) {
        return config.initialBlockNum
    }
    const fileName = path.join(config.persistentStorageDir, 'currentBlock')
    try {
        const currentBlock = BigInt(
            (await fs.promises.readFile(fileName)).toString('utf8').trim(),
        )
        logger.info(
            {
                fileName,
                currentBlock,
            },
            'Reading current block from file',
        )

        return currentBlock
    } catch (err) {
        logger.error(
            {
                fileName,
                err,
            },
            'Unable to read current block number from file',
        )
    }
    logger.info(
        'Unable to read current block from disk, falling back to config.initialBlockNum',
    )
    return config.initialBlockNum
}
