/**
 * @group load-tests-s2
 */

import { dlog } from '@river/mecholm'
import {
    createAndStartClient,
    createAndStartClients,
    multipleClientsJoinSpaceAndChannel,
} from './load_tests_util'
import { ethers } from 'ethers'
import { Queue, Worker } from 'bullmq'
// eslint-disable-next-line import/no-extraneous-dependencies
import { waitFor } from '@testing-library/react'

import {
    numMessagesConfig,
    numClientsConfig,
    connectionOptions,
    bobsAccount,
    accounts,
    loadTestQueueName,
    chainSpaceAndChannelJobName,
    jsonRpcProviderUrl,
    nodeRpcURL,
    loadTestShutdownQueueName,
    loadTestSignalCheckInterval,
    loadTestTimeout,
} from './loadconfig'
import { RiverSDK } from '../testSdk'

const { createSpaceDapp } = await import('@river/web3')

const base_log = dlog('csb:test:loadTestsS2')

describe('loadTestsScenario2', () => {
    test('create space, create channel, add #numClients users, send #numberOfMessages each, send signal to second jest', async () => {
        const log = base_log.extend('initiator')

        // Create a BullMQ queue instance to communicate with the second running test (receiver.test.ts)
        const myQueue = new Queue(loadTestQueueName, { connection: connectionOptions })

        log('start')
        const loadTestStartTime = Date.now()

        const bobClientWalletInfo = await createAndStartClient(
            bobsAccount,
            jsonRpcProviderUrl,
            nodeRpcURL,
        )
        const bob = bobClientWalletInfo.client
        const bobProvider = bobClientWalletInfo.provider
        const walletWithProvider = bobClientWalletInfo.walletWithProvider
        const network = await bobProvider.getNetwork()
        const bobChainId = network.chainId

        const balance = await walletWithProvider.getBalance()
        const balanceInEth = ethers.utils.formatEther(balance)
        const minBalanceRequired = ethers.utils.parseEther('0.01')
        log('minBalanceRequired:', minBalanceRequired)
        log('Wallet balance:', balance)
        log('Wallet balance.toString:', balance.toString())
        log('balanceInEth:', balanceInEth)
        log('Wallet address:', walletWithProvider.address)
        expect(balance.gte(minBalanceRequired)).toBe(true)

        const bobsSpaceDapp = createSpaceDapp({ chainId: bobChainId, provider: bobProvider })
        const bobsRiverSDK = new RiverSDK(bobsSpaceDapp, bob, walletWithProvider)

        // create space
        const createTownReturnVal = await bobsRiverSDK.createTownWithDefaultChannel('load-test', '')
        const spaceStreamId = createTownReturnVal.spaceStreamId

        // create channel
        const channelStreamId = await bobsRiverSDK.createChannel(
            spaceStreamId,
            'load-tests',
            'load-tests topic',
        )

        const spaceId = spaceStreamId
        const channelId = channelStreamId

        log('Clients join town and channel', spaceId, channelId)
        const createClientsAndJoinTownAndChannelStart = Date.now()
        const clientWalletInfos = await createAndStartClients(
            accounts.slice(0, numClientsConfig - 1),
            jsonRpcProviderUrl,
            nodeRpcURL,
        )

        await multipleClientsJoinSpaceAndChannel(clientWalletInfos, spaceId, channelId)
        const createClientsAndJoinTownAndChannelEnd = Date.now()
        log(
            `${accounts.length} Clients join town and channel duration:${
                createClientsAndJoinTownAndChannelEnd - createClientsAndJoinTownAndChannelStart
            }`,
        )

        const allClients = [bob] // bob and 9 other users
        for (let i = 0; i < numClientsConfig - 1; i++) {
            const clientWalletInfo = clientWalletInfos[`client_${i}`]
            allClients.push(clientWalletInfo.client)
        }

        log('Start sending message')
        const sendingMessageStartTime = Date.now()

        for (let i = 0; i < numClientsConfig; i++) {
            for (let j = 0; j < numMessagesConfig; j++) {
                const client = allClients[i]
                await client.sendMessage(
                    channelId,
                    `Message m_${j} from client_${i} with userId: ${client.userId}`,
                )

                log(
                    'Sending Message Progress',
                    (((i + 1) * 100) / numClientsConfig).toFixed(2),
                    '%',
                )
            }
        }
        const sendingMessageEndTime = Date.now()
        log('Send message done, time', sendingMessageEndTime - sendingMessageStartTime)
        log(
            'Initiator duration from start to finshing sending message:',
            sendingMessageEndTime - loadTestStartTime,
        )

        // Send a message to the queue to signal another part of the test to join channel and get messages
        const chainSpaceAndChannel = {
            chainId: bobChainId,
            spaceId,
            channelId,
        }

        const result = await myQueue.add(chainSpaceAndChannelJobName, chainSpaceAndChannel)

        let shutdownSignalRecieved = false
        // Start listenting for a message from another part of the test that it is done and we can shutdown this part of the test
        // Otherwise test fails as if this part shuts down earleir keys for decryption can not be shared
        // eslint-disable-next-line
        const _worker = new Worker(
            loadTestShutdownQueueName,
            // eslint-disable-next-line
            async (job) => {
                shutdownSignalRecieved = true
                return
            },
            { connection: connectionOptions },
        )
        // Wait for signal to be recieved
        await waitFor(() => expect(shutdownSignalRecieved).toBeTruthy(), {
            timeout: loadTestTimeout,
            interval: loadTestSignalCheckInterval,
        })
        log('Result:', result)

        // kill the clients
        for (const client of allClients) {
            client.stopSync()
        }
        const loadTestEndTime = Date.now()
        log('Done', {
            spaceId: spaceId,
            channelId: channelId,
            duration: loadTestEndTime - loadTestStartTime,
        })
    })
})
