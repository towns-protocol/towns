/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
import 'fake-indexeddb/auto'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import {
    Client,
    makeRiverConfig,
    makeRiverRpcClient,
    makeSignerContext,
    MockEntitlementsDelegate,
    RiverDbManager,
    streamIdAsString,
    userIdFromAddress,
    make_MemberPayload_KeySolicitation,
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
import { bin_fromBase64 } from '@towns-protocol/dlog'

// const APP_REGISTRY_URL = 'http://localhost:5180'
const ENV = 'local_multi'
const PORT = 5123
const SPACE_ID = '10b651d7e616eb74d8548bf9f608e0c9340fe74a820000000000000000000000'

// TODO: env and jwt should be env vars
const buildBot = async (mnemonic: string, encryptionDeviceBase64: string, _jwt?: string) => {
    const encryptionDevice = fromBinary(
        UserMetadataPayload_EncryptionDeviceSchema,
        bin_fromBase64(encryptionDeviceBase64),
    )
    // console.log(exportedDevice)
    // TODO: verify jwt
    // if (!jwt) {
    //     throw new Error('JWT is required')
    // }
    const server = new Hono()
    const wallet = ethers.Wallet.fromMnemonic(mnemonic)
    const delegateWallet = ethers.Wallet.createRandom()
    const signerContext = await makeSignerContext(wallet, delegateWallet)
    const config = makeRiverConfig(ENV)
    const riverProvider = new ethers.providers.StaticJsonRpcProvider(config.river.rpcUrl)
    const rpcClient = await makeRiverRpcClient(riverProvider, config.river.chainConfig)

    const userId = userIdFromAddress(signerContext.creatorAddress)
    const cryptoStore = RiverDbManager.getCryptoDb(userId)

    const client = new Client(
        signerContext,
        rpcClient,
        cryptoStore,
        new MockEntitlementsDelegate(), // argh is it okay?
    )

    await client.initializeUser({ spaceId: SPACE_ID }) // do we want to use the exported device?

    const executeEvents = async (events: EventPayload[]) => {
        for (const event of events) {
            console.log('executing event', event.payload)
            switch (event.payload.case) {
                case 'messages': {
                    for (const message of event.payload.value.messages) {
                        const event = fromBinary(StreamEventSchema, message.event)
                        console.log('message', event.payload)
                    }
                    break
                }
                case 'solicitation': {
                    const streamId = streamIdAsString(event.payload.value.streamId)
                    const missingSessionIds = event.payload.value.sessionIds.filter(
                        (sessionId) => sessionId !== '',
                    )
                    const { eventId } = await client.makeEventAndAddToStream(
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
            'response candy save output help again pulp fortune panic atom sugar wear',
            'CitIemJ0dmw1OC85YnVWQUIzelFQdUQ3VFdqelIwWTRnNmlxVXhkclloakhVEis3N1ZWZm1QU2pZVjdsbkZuNDNZQm5xNU9nOUlOam5mTXVwbkdzWUwydFFB',
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
