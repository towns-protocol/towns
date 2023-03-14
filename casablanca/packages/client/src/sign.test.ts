import { ecsign, hashPersonalMessage, publicToAddress, toRpcSig } from '@ethereumjs/util'
import { personalSign } from '@metamask/eth-sig-util'
import { Wallet } from 'ethers'
import _ from 'lodash'
import { checkDelegateSig, unpackEnvelope, makeDelegateSig, makeEvent, SignerContext } from './sign'
import { bin_fromHexString } from './types'
import debug from 'debug'
import { StreamKind, Payload, Payload_Message } from '@zion/proto'
import { PartialMessage, PlainMessage } from '@bufbuild/protobuf'
import { makeUserStreamId } from './id'

const log = debug('test:sign')

describe('sign', () => {
    const msg = 'Hello, World!'
    const privateKey = '0123456789012345678901234567890123456789012345678901234567890123'
    const privateKey2 = '0123456789012345678901234567890123456789012345678901234567890124'
    const primaryPrivateKey = '0123456789012345678901234567890123456789012345678901234567890125'
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

    test('compare-ethereumjs-metamask-ethers', async () => {
        const privateKeyBuffer = Buffer.from(privateKey, 'hex')

        const hashEjs = hashPersonalMessage(Buffer.from(msg))
        const sigStructEjs = ecsign(hashEjs, privateKeyBuffer)
        const sigEjs = toRpcSig(sigStructEjs.v, sigStructEjs.r, sigStructEjs.s)

        const sigMM = personalSign({ data: msg, privateKey: privateKeyBuffer })
        expect(sigEjs).toEqual(sigMM)

        const wallet = new Wallet(privateKey)
        const sigEthers = await wallet.signMessage(msg)
        expect(sigMM).toEqual(sigEthers)
    })

    test('delegate-sig', async () => {
        const sigWallet1 = new Wallet(privateKey)
        const sigWallet2 = new Wallet(privateKey2)
        const primaryWallet = new Wallet(primaryPrivateKey)

        const sig1 = await makeDelegateSig(primaryWallet, sigWallet1)
        log('sig1', sig1)
        const sig2 = await makeDelegateSig(primaryWallet, sigWallet2)
        log('sig2', sig2)
        expect(sig1).not.toEqual(sig2)

        expect(() =>
            checkDelegateSig(sigWallet1.publicKey, primaryWallet.address, sig1),
        ).not.toThrow()
        expect(() =>
            checkDelegateSig(sigWallet2.publicKey, primaryWallet.address, sig2),
        ).not.toThrow()

        expect(() => checkDelegateSig(sigWallet2.publicKey, primaryWallet.address, sig1)).toThrow()
        expect(() => checkDelegateSig(sigWallet1.publicKey, sigWallet2.address, sig1)).toThrow()
        expect(() => checkDelegateSig(sigWallet1.publicKey, primaryWallet.address, sig2)).toThrow()
        publicToAddress
    })

    const makeContext = async (
        privateKey: string,
        primaryPrivateKey?: string,
    ): Promise<SignerContext> => {
        const wallet = new Wallet(privateKey)
        if (primaryPrivateKey === undefined) {
            return { wallet, creatorAddress: bin_fromHexString(wallet.address) }
        } else {
            const primaryWallet = new Wallet(primaryPrivateKey)
            return {
                wallet,
                creatorAddress: bin_fromHexString(primaryWallet.address),
                delegateSig: await makeDelegateSig(primaryWallet, wallet),
            }
        }
    }

    const testParams: [string, () => Promise<SignerContext>, () => Promise<SignerContext>][] = [
        ['direct', () => makeContext(privateKey), () => makeContext(privateKey2)],
        [
            'delegate',
            () => makeContext(privateKey, primaryPrivateKey),
            () => makeContext(privateKey2, primaryPrivateKey),
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

            const message: PlainMessage<Payload_Message> = {
                text: 'Hello, World!',
            }
            const payload: PlainMessage<Payload> = {
                payload: {
                    case: 'message',
                    value: message,
                },
            }
            const event = makeEvent(context, payload, [hash])
            expect(unpackEnvelope(event)).toBeDefined()

            // Event with same payload from different wallet doesn't match
            const event2 = makeEvent(context2, payload, [hash])
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
            const event3 = makeEvent(context, payload, [hash])
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
                makeEvent(
                    context,
                    {
                        payload: {
                            case: 'inception',
                            value: {
                                streamId: makeUserStreamId(
                                    '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                                ),
                                streamKind: StreamKind.SK_USER,
                            },
                        },
                    },
                    [],
                ),
            ).toBeDefined()

            const payload: PlainMessage<Payload> = {
                payload: {
                    case: 'message',
                    value: { text: 'Hello, World!' },
                },
            }
            expect(makeEvent(context, payload, [hash])).toBeDefined()
            expect(makeEvent(context, payload, [hash, hash, hash])).toBeDefined()

            badHashes.forEach((h) => {
                expect(() => {
                    makeEvent(context, payload, [h])
                }).toThrow()
            })

            badHashes.forEach((h) => {
                expect(() => {
                    makeEvent(context, payload, [hash, h])
                }).toThrow()
            })
        },
    )
})
