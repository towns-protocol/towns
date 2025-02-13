import 'fake-indexeddb/auto' // used to mock indexdb in dexie, don't remove
import { check } from '@river-build/dlog'
import { makeRiverConfig } from '@river-build/sdk'
import { exit } from 'process'
import { Wallet } from 'ethers'
import { isSet } from './utils/expect'
import { setupChat, startStressChat } from './mode/chat/root_chat'
import { startStressSlowChat } from './mode/slowchat/root_slowchat'
import { getLogger } from './utils/logger'

check(isSet(process.env.RIVER_ENV), 'process.env.RIVER_ENV')
check(isSet(process.env.PROCESS_INDEX), 'process.env.PROCESS_INDEX')
const processIndex = parseInt(process.env.PROCESS_INDEX)

const config = makeRiverConfig(process.env.RIVER_ENV)
const logger = getLogger(`stress:run`)
logger.info('======================= run =======================')

if (processIndex === 0) {
    logger.info(process.env, 'env')
    logger.info(
        {
            environmentId: config.environmentId,
            base: { rpcUrl: config.base.rpcUrl },
            river: { rpcUrl: config.river.rpcUrl },
        },
        'config',
    )
}

function getRootWallet(): { wallet: Wallet; mnemonic: string } {
    check(isSet(process.env.MNEMONIC), 'process.env.MNEMONIC')
    const mnemonic = process.env.MNEMONIC
    const wallet = Wallet.fromMnemonic(mnemonic)
    return { wallet, mnemonic }
}

function getStressMode(): string {
    check(isSet(process.env.STRESS_MODE), 'process.env.STRESS_MODE')
    return process.env.STRESS_MODE
}

const run = async () => {
    switch (getStressMode()) {
        case 'chat':
            await startStressChat({
                config,
                processIndex,
                rootWallet: getRootWallet().wallet,
            })
            break
        case 'setup_chat':
            await setupChat({
                config,
                rootWallet: getRootWallet().wallet,
            })
            break
        case 'slowchat':
            await startStressSlowChat({
                config,
                processIndex,
                rootWallet: getRootWallet().wallet,
            })
            break
        default:
            throw new Error('unknown stress mode')
    }
    exit(0)
}
run().catch((e) => {
    logger.error(e, 'unhandled error:')
    exit(1)
})
