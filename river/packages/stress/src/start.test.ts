import { getSystemInfo } from './utils/systemInfo'
import { setupChat, startStressChat } from './mode/chat/root_chat'
import { genShortId, makeRiverConfig } from '@river-build/sdk'
import { LocalhostWeb3Provider } from '@river-build/web3'
import { getLogger } from './utils/logger'

const logger = getLogger('stress:test')

describe('start.test.ts', () => {
    it('just runs', () => {
        logger.info(getSystemInfo(), 'systemInfo')
        expect(true).toBe(true)
    })

    // run a very short test
    it('setup and run test', async () => {
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
        const randomClientsCount = 1
        // const totalClients = clientsCount + randomClientsCount

        // set some env props
        process.env.SESSION_ID = genShortId()
        process.env.STRESS_DURATION = '10'
        process.env.CLIENTS_PER_PROCESS = clientsCount.toString()
        process.env.CLIENTS_COUNT = clientsCount.toString()
        process.env.RANDOM_CLIENTS_COUNT = randomClientsCount.toString()
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
            logger.info({ key, value }, 'checkinCounts')
            expect(value).toBeDefined()
            // expect(value[totalClients.toString()]).toBe(totalClients) // todo aellis renable
        }
    })
})
