import { StreamAndCookie, SyncCookie } from '@towns-protocol/proto'
import {
    makeUserSettingsStreamId,
    streamIdAsString,
    streamIdToBytes,
    userIdFromAddress,
} from '../../id'
import { StreamRpcClient } from '../../makeStreamRpcClient'
import { makeEvent } from '../../sign'
import { SignerContext } from '../../signerContext'
import {
    make_UserSettingsPayload_FullyReadMarkers,
    make_UserSettingsPayload_Inception,
} from '../../types'
import { makeRandomUserContext, makeTestRpcClient, waitFor } from '../testUtils'

describe('streamRpcClientGetSince', () => {
    let bobsContext: SignerContext
    let client: StreamRpcClient
    let bobsUserId: string
    let bobsSettingsStreamId: Uint8Array
    let cookie: SyncCookie
    let settingsStream: StreamAndCookie

    beforeAll(async () => {
        bobsContext = await makeRandomUserContext()
        client = await makeTestRpcClient()
        bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        bobsSettingsStreamId = streamIdToBytes(makeUserSettingsStreamId(bobsUserId))

        const settingsStreamResp = await client.createStream({
            events: [
                await makeEvent(
                    bobsContext,
                    make_UserSettingsPayload_Inception({
                        streamId: bobsSettingsStreamId,
                    }),
                ),
            ],
            streamId: bobsSettingsStreamId,
        })

        if (!settingsStreamResp.stream) {
            throw new Error('No stream')
        }

        settingsStream = settingsStreamResp.stream

        if (!settingsStream.nextSyncCookie) {
            throw new Error('No sync cookie')
        }
        cookie = settingsStream.nextSyncCookie
    })

    test('should get the stream since the given sync cookie with no changes', async () => {
        // fetch the stream since the given cookie
        const streamSince = await client.getStream({
            streamId: bobsSettingsStreamId,
            syncCookie: cookie,
        })

        expect(streamSince.stream?.events.length).toBe(0)
        expect(streamSince.stream?.miniblocks.length).toBe(0)
        expect(streamSince.stream?.nextSyncCookie).toEqual(cookie)
    })

    test('should get the stream since the given sync cookie with a change', async () => {
        for (let i = 0; i < 2; i++) {
            await client.addEvent({
                streamId: bobsSettingsStreamId,
                event: await makeEvent(
                    bobsContext,
                    make_UserSettingsPayload_FullyReadMarkers({
                        streamId: bobsSettingsStreamId,
                        content: {
                            data: `foo ${i}`,
                        },
                    }),
                    settingsStream.miniblocks.at(-1)?.header?.hash,
                ),
            })
        }
        await waitFor(async () => {
            // fetch the stream since the given cookie
            const streamSince = await client.getStream({
                streamId: bobsSettingsStreamId,
                syncCookie: cookie,
            })

            // this tricky... we should get 2 events but sometimes they will be in a block
            expect(streamSince.stream?.events.length).toBe(2)
            expect(streamSince.stream?.miniblocks.length).toBe(0)
            expect(streamSince.stream?.syncReset).toBe(false)
        })
    })

    test('make block with 2 events', async () => {
        await client.info({
            debug: ['make_miniblock', streamIdAsString(bobsSettingsStreamId), 'true'],
        })
        await waitFor(async () => {
            // eventually the block should get made and we should have miniblocks instead of events in the pool
            const streamSince = await client.getStream({
                streamId: bobsSettingsStreamId,
                syncCookie: cookie,
            })
            expect(streamSince.stream?.events.length).toBeGreaterThanOrEqual(3) // all events since last cookie
            expect(streamSince.stream?.miniblocks.length).toBe(0)
            expect(streamSince.stream?.syncReset).toBe(false)
        })
    })

    test('make a new snapshot', async () => {
        // this test expects RecencyConstraintsGen to be 5
        for (let i = 0; i < 6; i++) {
            const resp = await client.getLastMiniblockHash({ streamId: bobsSettingsStreamId })
            await client.addEvent({
                streamId: bobsSettingsStreamId,
                event: await makeEvent(
                    bobsContext,
                    make_UserSettingsPayload_FullyReadMarkers({
                        streamId: bobsSettingsStreamId,
                        content: {
                            data: `foo2 ${i}`,
                        },
                    }),
                    resp.hash,
                ),
            })
            await client.info({
                debug: ['make_miniblock', streamIdAsString(bobsSettingsStreamId), 'true'],
            })
        }

        // eventually the stream will have a snapshot and the blocks will fall out of the stream view in the node
        // so we will have an old sync cookie and get a sync reset
        await waitFor(
            async () => {
                const streamSince = await client.getStream({
                    streamId: bobsSettingsStreamId,
                    syncCookie: cookie,
                })

                expect(streamSince.stream?.events.length).toBe(0)
                expect(streamSince.stream?.miniblocks.length).toBeGreaterThan(0)
                expect(streamSince.stream?.syncReset).toBe(true)
            },
            { timeoutMS: 15000 },
        )
    })
})
