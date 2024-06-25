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
import { RiverRegistry, SpaceDapp } from '@river-build/web3'
import { User } from './user'
import { UserMemberships } from './models/userMemberships'
import { makeUserContextFromWallet } from '../../util.test'
import { makeClientParams } from '../utils/syncAgentUtils.test'

const logger = dlogger('csb:test:user')

describe('User.test.ts', () => {
    logger.log('start')
    const riverConfig = makeRiverConfig()
    const store = new Store(genShortId(), 1, [RiverNodeUrls, UserMemberships, User])
    store.newTransactionGroup('init')
    const river = riverConfig.river
    const riverProvider = new providers.StaticJsonRpcProvider(river.rpcUrl)
    const base = riverConfig.base
    const baseProvider = new providers.StaticJsonRpcProvider(base.rpcUrl)
    const riverRegistryDapp = new RiverRegistry(river.chainConfig, riverProvider)
    const spaceDapp = new SpaceDapp(base.chainConfig, baseProvider)

    const userWallet = Wallet.createRandom()
    const userId = userWallet.address

    test('User initializes from empty', async () => {
        const context = await makeUserContextFromWallet(userWallet)
        const clientParams = makeClientParams({ context, riverConfig }, spaceDapp)
        const riverConnection = new RiverConnection(store, riverRegistryDapp, clientParams)
        const user = new User(userId, store, riverConnection)
        expect(user.data.id).toBe(userId)
        expect(user.data.initialized).toBe(false)
        expect(user.memberships.data.initialized).toBe(false)
        //expect(user.inbox.data.initialized).toBe(false)
        //expect(user.deviceKeys.data.initialized).toBe(false)
        //expect(user.settings.data.initialized).toBe(false)

        await store.commitTransaction()
        expect(user.data.id).toBe(userId)
        expect(user.data.initialized).toBe(false)
        expect(user.memberships.data.initialized).toBe(false)
        //expect(user.inbox.data.initialized).toBe(false)
        //expect(user.deviceKeys.data.initialized).toBe(false)
        //expect(user.settings.data.initialized).toBe(false)

        await user.initialize() // if we run against non entitled backend, we don't need to pass spaceid
        expect(user.data.initialized).toBe(true)
        expect(user.memberships.data.initialized).toBe(true)
        //expect(user.inbox.data.initialized).toBe(false)
        //expect(user.deviceKeys.data.initialized).toBe(false)
        //expect(user.settings.data.initialized).toBe(false)
    })
    test('User loads from db', async () => {
        store.newTransactionGroup('init2')
        const context = await makeUserContextFromWallet(userWallet)
        const clientParams = makeClientParams({ context, riverConfig }, spaceDapp)
        const riverConnection = new RiverConnection(store, riverRegistryDapp, clientParams)
        const user = new User(userId, store, riverConnection)
        expect(user.value.status).toBe('loading')

        await store.commitTransaction()
        expect(user.value.status).toBe('loaded')
        expect(user.data.initialized).toBe(true)
        expect(user.memberships.data.initialized).toBe(true)
    })
})
