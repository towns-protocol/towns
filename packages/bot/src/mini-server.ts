/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
import 'fake-indexeddb/auto'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import {
    makeRiverConfig,
    makeSignerContext,
    streamIdAsString,
    make_MemberPayload_KeySolicitation,
    SyncAgent,
    isDefined,
    spaceIdFromChannelId,
    RiverTimelineEvent,
} from '@towns-protocol/sdk'
import { create, fromBinary, toBinary } from '@bufbuild/protobuf'
import { ethers } from 'ethers'
import {
    AppServiceRequestSchema,
    AppServiceResponseSchema,
    StreamEventSchema,
    UserMetadataPayload_EncryptionDeviceSchema,
    type EventPayload,
} from '@towns-protocol/proto'
import { bin_fromBase64, bin_toHexString, check } from '@towns-protocol/dlog'

const ENV = 'local_multi'
const PORT = 5123

// TODO: env and jwt should be env vars
// TODO: use ExportedDevice?
const buildBot = async (mnemonic: string, encryptionDeviceBase64: string, _jwt?: string) => {
    const encryptionDevice = fromBinary(
        UserMetadataPayload_EncryptionDeviceSchema,
        bin_fromBase64(encryptionDeviceBase64),
    )
    // TODO: verify jwt
    const server = new Hono()
    const wallet = ethers.Wallet.fromMnemonic(mnemonic)
    const delegateWallet = ethers.Wallet.createRandom()
    const signerContext = await makeSignerContext(wallet, delegateWallet)
    const riverConfig = makeRiverConfig(ENV)

    const syncAgent = new SyncAgent({
        context: signerContext,
        riverConfig,
    })

    await syncAgent.start()

    const executeEvents = async (events: EventPayload[]) => {
        if (!syncAgent.riverConnection.client) {
            console.error('River connection client not initialized')
            return
        }

        for (const appEvent of events) {
            switch (appEvent.payload.case) {
                case 'messages': {
                    // NOTE: Since I'm using synced streams, I can just read/write message to the stream.
                    // If I didnt had it, I would need to get the keys from groupEncryptionSessionsMessages to decrypt
                    // const groupMessages = event.payload.value.groupEncryptionSessionsMessages.map(x) => fromBinary(StreamEventSchema, x.event))

                    const streamId = streamIdAsString(appEvent.payload.value.streamId)
                    const spaceId = spaceIdFromChannelId(streamId)

                    for (const envelope of appEvent.payload.value.messages) {
                        const event = fromBinary(StreamEventSchema, envelope.event)
                        const isMyEvent =
                            bin_toHexString(event.creatorAddress) ===
                            bin_toHexString(signerContext.creatorAddress)
                        if (isMyEvent) {
                            continue
                        }
                        switch (event.payload.case) {
                            case 'channelPayload': {
                                if (event.payload.value?.content.case !== 'message') {
                                    return
                                }
                                const space = syncAgent.spaces.getSpace(spaceId)
                                const channel = space?.getChannel(streamId)
                                check(isDefined(channel), 'Channel not found')
                                const eventId = bin_toHexString(envelope.hash)
                                const message = channel.timeline.events.value.find(
                                    (e) => e.eventId === eventId,
                                )
                                await channel.sendMessage(
                                    message?.content?.kind === RiverTimelineEvent.ChannelMessage
                                        ? `echo: ${message.content.body}`
                                        : 'oops, thelastone   wasnta  message?',
                                )
                                break
                            }
                        }
                    }
                    break
                }
                case 'solicitation': {
                    const streamId = streamIdAsString(appEvent.payload.value.streamId)
                    const missingSessionIds = appEvent.payload.value.sessionIds.filter(
                        (sessionId) => sessionId !== '',
                    )
                    const { eventId } =
                        await syncAgent.riverConnection.client.makeEventAndAddToStream(
                            streamId,
                            make_MemberPayload_KeySolicitation({
                                deviceKey: encryptionDevice.deviceKey,
                                fallbackKey: encryptionDevice.fallbackKey,
                                isNewDevice: missingSessionIds.length === 0,
                                sessionIds: missingSessionIds,
                            }),
                        )
                    console.log('sent key solicitation for sessions:', missingSessionIds, eventId)
                    break
                }
            }
        }
    }

    // const AppRegistry = makeAppRegistryRpcClient(APP_REGISTRY_URL, sessionToken) // ?
    server.get('/', (c) => {
        return c.json({ message: 'Hello, world!' })
    })
    server.post('/webhook', async (c) => {
        const body = await c.req.arrayBuffer()
        const request = fromBinary(AppServiceRequestSchema, new Uint8Array(body))

        console.log(request)

        // Create response based on request type
        // status is the default (?)
        let response = create(AppServiceResponseSchema, {
            payload: {
                case: 'status',
                value: {
                    frameworkVersion: 1,
                    deviceKey: encryptionDevice.deviceKey,
                    fallbackKey: encryptionDevice.fallbackKey,
                },
            },
        })

        switch (request.payload.case) {
            case 'initialize': {
                response = create(AppServiceResponseSchema, {
                    payload: {
                        case: 'initialize',
                        value: {
                            encryptionDevice,
                        },
                    },
                })
                break
            }

            case 'status': {
                response = create(AppServiceResponseSchema, {
                    payload: {
                        case: 'status',
                        value: {
                            frameworkVersion: 1,
                            deviceKey: encryptionDevice.deviceKey,
                            fallbackKey: encryptionDevice.fallbackKey,
                        },
                    },
                })
                break
            }

            case 'events': {
                console.log('--------------------------------')
                await executeEvents(request.payload.value.events)
                console.log('--------------------------------')
                break
            }
        }
        c.header('Content-Type', 'application/x-protobuf')
        return c.body(toBinary(AppServiceResponseSchema, response))
    })
    return { server }
}

async function main() {
    try {
        const { server } = await buildBot(
            'grass road fame clock drink wrap bleak peasant shallow lock margin lawn',
            'Cituc2tZeTBrSTBHTVJZU2NFbit0c0FGcnNRUXh3bkhmcGY5NHRva05NMG0wEitOS3B6ekhsNVZjQWxWQ1R3cTBKYTNCbVVOV3dIZkF4aVVPRDlnRExGeUJv',
        )
        console.log(`Server is running on http://localhost:${PORT}`)
        serve({ fetch: server.fetch, port: PORT })
    } catch (error) {
        console.error('Failed to start server:', error)
        process.exit(1)
    }
}

main().catch((error) => {
    console.error('Unhandled error:', error)
    process.exit(1)
})
