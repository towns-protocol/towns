import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals'
import { Client, makeZionRpcClient } from '@zion/client'
import {
    FullEvent,
    makeChannelStreamId,
    makeSpaceStreamId,
    MessagePayload,
    StreamKind,
} from '@zion/core'
import debug from 'debug'
import { Wallet } from 'ethers'
import { nanoid } from 'nanoid'
import { startZionApp, ZionApp } from '../app'

const log = debug('test')

describe('BobAndAliceSendAMessageViaClient', () => {
    let zionApp: ZionApp

    beforeAll(async () => {
        zionApp = startZionApp(0)
    })

    afterAll(async () => {
        await zionApp.stop()
    })

    let bobsWallet: Wallet
    let alicesWallet: Wallet

    beforeEach(async () => {
        bobsWallet = Wallet.createRandom()
        alicesWallet = Wallet.createRandom()
    })

    const bobCanReconnect = async () => {
        const rpcClient = makeZionRpcClient(zionApp.url)
        const bobsClient = new Client(bobsWallet, rpcClient)

        let resolve: (value: string) => void
        let reject: (reason: any) => void
        const done = new Promise<string>((res, rej) => {
            resolve = res
            reject = rej
        })

        const onChannelNewMessage = (channelId: string, message: FullEvent): void => {
            log('channelNewMessage', channelId)
            log(message)
            try {
                const payload = message.base.payload as MessagePayload
                expect(payload.text).toBe('Hello, again!')
                resolve('done')
            } catch (e) {
                reject(e)
            }
        }

        const onStreamInitialized = (streamId: string, streamKind: StreamKind) => {
            log('streamInitialized', streamId, streamKind)
            try {
                if (streamKind === StreamKind.Channel) {
                    const channel = bobsClient.stream(streamId)
                    log('channel content')
                    log(channel.rollup)

                    expect(Array.from(channel.rollup.messages.values())).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                base: expect.objectContaining({
                                    payload: expect.objectContaining({ text: 'Hello, world!' }),
                                }),
                            }),
                        ]),
                    )

                    channel.on('channelNewMessage', onChannelNewMessage)
                    bobsClient.sendMessage(streamId, 'Hello, again!')
                }
            } catch (e) {
                reject(e)
            }
        }
        bobsClient.on('streamInitialized', onStreamInitialized)

        await expect(bobsClient.loadExistingUser()).resolves.toBeUndefined()

        bobsClient.startSync(1000)

        await expect(done).resolves.toBe('done')

        await bobsClient.stopSync()

        return 'done'
    }

    test('bobTalksToHimself', async () => {
        const rpcClient = makeZionRpcClient(zionApp.url)
        const bobsClient = new Client(bobsWallet, rpcClient)

        let resolve: (value: string) => void
        let reject: (reason: any) => void
        const done = new Promise<string>((res, rej) => {
            resolve = res
            reject = rej
        })

        const onChannelNewMessage = (channelId: string, message: FullEvent): void => {
            log('channelNewMessage', channelId)
            log(message)
            try {
                const payload = message.base.payload as MessagePayload
                expect(payload.text).toBe('Hello, world!')
                resolve('done')
            } catch (e) {
                reject(e)
            }
        }

        const onStreamInitialized = (streamId: string, streamKind: StreamKind) => {
            log('streamInitialized', streamId, streamKind)
            try {
                if (streamKind === StreamKind.Channel) {
                    const channel = bobsClient.stream(streamId)
                    log('channel content')
                    log(channel.rollup)

                    channel.on('channelNewMessage', onChannelNewMessage)
                    bobsClient.sendMessage(streamId, 'Hello, world!')
                }
            } catch (e) {
                reject(e)
            }
        }
        bobsClient.on('streamInitialized', onStreamInitialized)

        await expect(bobsClient.createNewUser()).resolves.toBeUndefined()

        bobsClient.startSync(1000)

        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + nanoid())
        await expect(bobsClient.createSpace(bobsSpaceId)).resolves.toBeUndefined()

        await expect(
            bobsClient.createChannel(makeChannelStreamId('bobs-channel-' + nanoid()), bobsSpaceId),
        ).resolves.toBeUndefined()

        await expect(done).resolves.toBe('done')

        await bobsClient.stopSync()

        log('pass1 done')

        await expect(bobCanReconnect()).resolves.toBe('done')

        log('pass2 done')
    })
})
