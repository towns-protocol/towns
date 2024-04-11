/**
 * @group main
 */

import { dlog } from '@river-build/dlog'
import { ethers } from 'ethers'
import { LocalhostWeb3Provider, createRiverRegistry } from '@river-build/web3'
import { makeRiverChainConfig } from './riverConfig'

const log = dlog('csb:test')

describe('nodeSelectionsTests', () => {
    test('TestRiverRegistryNodeRetrieval', async () => {
        // set up the web3 provider and riverRegistry
        const riverConfig = makeRiverChainConfig()
        const bobsWallet = ethers.Wallet.createRandom()
        const bobRiverChainProvider = new LocalhostWeb3Provider(riverConfig.rpcUrl, bobsWallet)

        // create river registry
        const riverRegistry = createRiverRegistry(bobRiverChainProvider, riverConfig.chainConfig)
        // read nodes from river registry
        const nodes = await riverRegistry.getAllNodes()
        log('river registry rpc nodes', nodes)
        expect(nodes).toBeDefined()
        if (nodes) {
            expect(Object.values(nodes).length).toBeGreaterThan(0)
        }

        const nodes2 = await riverRegistry.getAllNodes(2)
        log('river registry rpc nodes', nodes)
        expect(nodes2).toBeDefined()
        if (nodes2) {
            expect(Object.values(nodes2).length).toBeGreaterThan(0)
        }

        const nodeUrls = await riverRegistry.getAllNodeUrls()
        log('river registry rpc node urls', nodeUrls)
        expect(nodeUrls).toBeDefined()
        expect(nodeUrls?.length).toBeGreaterThan(0)

        const nodeUrlsOperational = await riverRegistry.getAllNodeUrls(2)
        log('river registry rpc operational node urls', nodeUrls)
        expect(nodeUrlsOperational).toBeDefined()
        expect(nodeUrlsOperational?.length).toBeGreaterThan(0)

        log('Done')
    })
})
