import _ from 'lodash'
import { checkDelegateSig, unpackEnvelope, makeEvent, SignerContext } from './sign'
import { make_UserPayload_Inception } from './types'
import { bin_fromHexString, bin_toHexString } from './binary'
import { dlog } from './dlog'
import { PlainMessage } from '@bufbuild/protobuf'
import { makeUserStreamId } from './id'
import { makeTownsDelegateSig, makeOldTownsDelegateSig, publicKeyToAddress } from './crypto/crypto'
import { getPublicKey } from 'ethereum-cryptography/secp256k1'
import { ethers } from 'ethers'
import { EncryptedData, StreamEvent } from '@river/proto'

const log = dlog('test:sign')

describe('sign', () => {
    const keys = [
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        '0123456789012345678901234567890123456789012345678901234567890124',
        '0123456789012345678901234567890123456789012345678901234567890125',
        'aaaa456789012345678901234567890123456789012345678901234567890125',
    ].map((key) => {
        const pub = getPublicKey(key)
        return {
            privateKey: key,
            publicKey: pub,
            address: publicKeyToAddress(pub),
        }
    })
    const hash = bin_fromHexString(
        '0x8dc27dbd6fc775e3a05c509c6eb1c63c4ab5bc6e7010bf9a9a80a42ae1ea56b0',
    )
    const badHashes = [
        bin_fromHexString('0x8dc27dbd6fc775e3a05c509c6eb1c63c4ab5bc6e7010bf9a9a80a42ae1ea56b000'),
        bin_fromHexString('0x8dc27dbd6fc775e3a05c509c6eb1c63c4ab5bc6e7010bf9a9a80a42ae1ea56'),
    ]

    test('i-need-buffer', () => {
        const buffer = Buffer.from('hello world', 'ascii')
        expect(buffer).toBeInstanceOf(Uint8Array)
    })

    test('delegate-sig', async () => {
        const device1 = keys[0]
        const device2 = keys[1]
        const user = keys[2]

        const sig1 = await makeTownsDelegateSig(() => user.privateKey, device1.publicKey)
        log('sig1', bin_toHexString(sig1))
        const sig2 = await makeTownsDelegateSig(() => user.privateKey, device2.publicKey)
        log('sig2', bin_toHexString(sig2))
        expect(sig1).not.toEqual(sig2)

        expect(() => checkDelegateSig(device1.publicKey, user.address, sig1)).not.toThrow()
        expect(() => checkDelegateSig(device2.publicKey, user.address, sig2)).not.toThrow()

        expect(() => checkDelegateSig(device2.publicKey, user.address, sig1)).toThrow()
        expect(() => checkDelegateSig(device1.publicKey, device2.address, sig1)).toThrow()
        expect(() => checkDelegateSig(device1.publicKey, user.address, sig2)).toThrow()
    })

    test('old-format-delegate', async () => {
        const primary = keys[0]
        const primaryWallet = new ethers.Wallet(primary.privateKey)

        const device = keys[1]
        log('device PublicKey', bin_toHexString(device.publicKey))
        const delegateSig = await makeOldTownsDelegateSig(primaryWallet, device.publicKey)
        log('OLD delegateSig', bin_toHexString(delegateSig))

        expect(() => checkDelegateSig(device.publicKey, primary.address, delegateSig)).not.toThrow()
    })

    const makeContext = async (
        userPrivateKey: string,
        devicePrivateKey?: string,
    ): Promise<SignerContext> => {
        const creatorAddress = publicKeyToAddress(getPublicKey(userPrivateKey, false))
        if (devicePrivateKey === undefined) {
            return {
                signerPrivateKey: () => userPrivateKey,
                creatorAddress,
            }
        } else {
            return {
                signerPrivateKey: () => devicePrivateKey,
                creatorAddress,
                delegateSig: await makeTownsDelegateSig(
                    () => userPrivateKey,
                    getPublicKey(devicePrivateKey, false),
                ),
            }
        }
    }

    const testParams: [string, () => Promise<SignerContext>, () => Promise<SignerContext>][] = [
        ['direct', () => makeContext(keys[0].privateKey), () => makeContext(keys[1].privateKey)],
        [
            'delegate',
            () => makeContext(keys[0].privateKey, keys[1].privateKey),
            () => makeContext(keys[2].privateKey, keys[3].privateKey),
        ],
    ]

    test.each(testParams)(
        'sign-and-verify-%s',
        async (
            method: string,
            c: () => Promise<SignerContext>,
            c2: () => Promise<SignerContext>,
        ) => {
            const context = await c()
            const context2 = await c2()

            const message: PlainMessage<EncryptedData> = {
                text: 'Hello, World!',
            }
            const payload: PlainMessage<StreamEvent>['payload'] = {
                case: 'channelPayload',
                value: {
                    content: {
                        case: 'message',
                        value: message,
                    },
                },
            }
            const event = await makeEvent(context, payload, [hash])
            expect(unpackEnvelope(event)).toBeDefined()

            // Event with same payload from different wallet doesn't match
            const event2 = await makeEvent(context2, payload, [hash])
            expect(unpackEnvelope(event2)).toBeDefined()
            expect(event2).not.toEqual(event)

            expect(() => {
                const e = _.cloneDeep(event)
                e.hash = event2.hash
                unpackEnvelope(e)
            }).toThrow()

            expect(() => {
                const e = _.cloneDeep(event)
                e.signature = event2.signature
                unpackEnvelope(e)
            }).toThrow()

            expect(() => {
                const e = _.cloneDeep(event)
                e.event = event2.event
                unpackEnvelope(e)
            }).toThrow()

            // Event with same payload from the same wallet doesn't match
            const event3 = await makeEvent(context, payload, [hash])
            expect(unpackEnvelope(event3)).toBeDefined()
            expect(event3.hash).not.toEqual(event.hash)
            expect(event3).not.toEqual(event)
        },
    )

    test.each(testParams)(
        'validate-prev-events-%s',
        async (method: string, c: () => Promise<SignerContext>) => {
            const context = await c()
            expect(
                await makeEvent(
                    context,
                    make_UserPayload_Inception({
                        streamId: makeUserStreamId('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
                    }),
                    [],
                ),
            ).toBeDefined()

            const payload: PlainMessage<StreamEvent>['payload'] = {
                case: 'channelPayload',
                value: {
                    content: {
                        case: 'message',
                        value: { text: 'Hello, World!' },
                    },
                },
            }
            expect(await makeEvent(context, payload, [hash])).toBeDefined()
            expect(await makeEvent(context, payload, [hash, hash, hash])).toBeDefined()

            for (const h of badHashes) {
                await expect(makeEvent(context, payload, [h])).rejects.toThrow()
            }

            for (const h of badHashes) {
                await expect(makeEvent(context, payload, [hash, h])).rejects.toThrow()
            }
        },
    )
})
