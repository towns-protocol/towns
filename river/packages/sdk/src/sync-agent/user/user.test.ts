/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/**
 * @group main
 */

import { dlogger } from '@river-build/dlog'
import { Store } from '../../store/store'
import { makeRiverConfig } from '../../riverConfig'
import { genShortId } from '../../id'
import { Wallet, providers } from 'ethers'
import { RiverNodeUrls } from '../river-connection/models/riverNodeUrls'
import { RiverConnection } from '../river-connection/riverConnection'
import { RiverRegistry } from '@river-build/web3'
import { User } from './user'
import { StreamsClient } from '../streams/streamsClient'
import { UserMemberships } from './models/userMemberships'

const logger = dlogger('csb:test:user')

describe('User.test.ts', () => {
    logger.log('start')
    const config = makeRiverConfig()
    const store = new Store(genShortId(), 1, [RiverNodeUrls, UserMemberships, User])
    store.newTransactionGroup('init')
    const river = config.river
    const riverProvider = new providers.StaticJsonRpcProvider(river.rpcUrl, {
        chainId: river.chainConfig.chainId,
        name: `river-${river.chainConfig.chainId}`,
    })
    const riverRegistryDapp = new RiverRegistry(river.chainConfig, riverProvider)
    const riverConnection = new RiverConnection(store, riverRegistryDapp)
    const streamsClient = new StreamsClient(riverConnection)
    const userWallet = Wallet.createRandom()
    const userId = userWallet.address

    test('User initializes from empty', async () => {
        const user = new User(userId, store, streamsClient)
        expect(user.data.id).toBe(userId)
        expect(user.data.initialized).toBe(false)
        expect(user.memberships.data.initialized).toBe(false)

        await store.commitTransaction()
        expect(user.data.id).toBe(userId)
        expect(user.data.initialized).toBe(false)
        expect(user.memberships.data.initialized).toBe(false)

        await user.initialize() // if we run against non entitled backend, we don't need to pass spaceid
        expect(user.data.initialized).toBe(true)
        expect(user.memberships.data.initialized).toBe(true)
    })
    test('User loads from db', async () => {
        store.newTransactionGroup('init2')
        const user = new User(userId, store, streamsClient)
        expect(user.value.status).toBe('loading')

        await store.commitTransaction()
        expect(user.value.status).toBe('loaded')
        expect(user.data.initialized).toBe(true)
        expect(user.memberships.data.initialized).toBe(true)
    })
})
