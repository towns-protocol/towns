import { dlogger } from '@river-build/dlog'
import { printSystemInfo } from './utils/systemInfo'
import { setupChat, startStressChat } from './mode/chat/root_chat'
import { genShortId, makeRiverConfig } from '@river/sdk'
import { LocalhostWeb3Provider } from '@river-build/web3'

const logger = dlogger('stress:test')

describe('run.test.ts', () => {
    it('just runs', () => {
        printSystemInfo(logger)
        expect(true).toBe(true)
    })

    // run a very short test
    test('setup and run test', async () => {
        const config = makeRiverConfig()
        const rootProvider = new LocalhostWeb3Provider(config.base.rpcUrl)
        await rootProvider.fundWallet()

        const setup = await setupChat({
            config,
            rootWallet: rootProvider.wallet,
            makeAnnounceChannel: false,
            numChannels: 1,
        })

        const clientsCount = 2

        // set some env props
        process.env.SESSION_ID = genShortId()
        process.env.STRESS_DURATION = '10'
        process.env.CLIENTS_PER_PROCESS = clientsCount.toString()
        process.env.CLIENTS_COUNT = clientsCount.toString()
        process.env.SPACE_ID = setup.spaceId
        process.env.CHANNEL_IDS = setup.channelIds[0].toString() // only run one channel
        process.env.CONTAINER_INDEX = '0'
        process.env.CONTAINER_COUNT = '1'
        process.env.PROCESSES_PER_CONTAINER = '1'

        const result = await startStressChat({
            config,
            processIndex: 0,
            rootWallet: rootProvider.wallet,
        })

        expect(result).toBeDefined()
        expect(result.summary.checkinCounts).toBeDefined()
        for (const key in result.summary.checkinCounts) {
            const value = result.summary.checkinCounts[key]
            logger.log('checkinCounts key', key, value)
            expect(value).toBeDefined()
            expect(value[clientsCount.toString()]).toBe(clientsCount)
        }
    })
})
