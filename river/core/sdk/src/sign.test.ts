/**
 * @group main
 */

import _ from 'lodash'
import { unpackEnvelope, makeEvent, publicKeyToAddress } from './sign'
import { make_UserPayload_Inception } from './types'
import { dlog, bin_fromHexString, bin_toHexString } from '@river-build/dlog'
import { PlainMessage } from '@bufbuild/protobuf'
import { makeUserStreamId, streamIdToBytes } from './id'
import { getPublicKey } from 'ethereum-cryptography/secp256k1'
import { ethers } from 'ethers'
import { EncryptedData, StreamEvent } from '@river-build/proto'
import { TEST_ENCRYPTED_MESSAGE_PROPS } from './util.test'
import { SignerContext, checkDelegateSig, makeSignerContext } from './signerContext'

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
        // one user has two delegates (two devices, A and B)
        const user = keys[0]
        const delegateA = keys[1]
        const delegateB = keys[2]

        const userWallet = new ethers.Wallet(user.privateKey)
        const delegateA_wallet = new ethers.Wallet(delegateA.privateKey)
        const delegateB_wallet = new ethers.Wallet(delegateB.privateKey)
        const expiryA_none = 0n
        const expiryB_valid = BigInt(Date.now() + 10000)
        const expiry_WRONG = BigInt(Date.now() + 99999)
        const delegateA_context = await makeSignerContext(
            userWallet,
            delegateA_wallet,
            expiryA_none,
        )
        const delegateB_context = await makeSignerContext(
            userWallet,
            delegateB_wallet,
            expiryB_valid,
        )

        const sigA = delegateA_context.delegateSig!
        log('sigA', bin_toHexString(sigA))
        const sigB = delegateB_context.delegateSig!
        log('sigB', bin_toHexString(sigB))
        expect(sigA).not.toEqual(sigB)

        expect(() =>
            checkDelegateSig({
                delegatePubKey: delegateA.publicKey,
                creatorAddress: user.address,
                delegateSig: sigA,
                expiryEpochMs: expiryA_none,
            }),
        ).not.toThrow()
        expect(() =>
            checkDelegateSig({
                delegatePubKey: delegateB.publicKey,
                creatorAddress: user.address,
                delegateSig: sigB,
                expiryEpochMs: expiryB_valid,
            }),
        ).not.toThrow()

        // expect wrong sig (B instead of A) to throw
        expect(() =>
            checkDelegateSig({
                delegatePubKey: delegateB.publicKey,
                creatorAddress: user.address,
                delegateSig: sigB,
                expiryEpochMs: expiryA_none,
            }),
        ).toThrow()
        // expect wrong creator address (delegate B instead of user) to throw
        expect(() =>
            checkDelegateSig({
                delegatePubKey: delegateA.publicKey,
                creatorAddress: delegateB.address,
                delegateSig: sigA,
                expiryEpochMs: expiryA_none,
            }),
        ).toThrow()
        // expect wrong sig and wrong expiry (B instead of A) to throw
        expect(() =>
            checkDelegateSig({
                delegatePubKey: delegateA.publicKey,
                creatorAddress: user.address,
                delegateSig: sigB,
                expiryEpochMs: expiryB_valid,
            }),
        ).toThrow()
        // expict wrong expiry (expiry_WRONG instead of expiryA_none) to throw
        expect(() =>
            checkDelegateSig({
                delegatePubKey: delegateA.publicKey,
                creatorAddress: user.address,
                delegateSig: sigA,
                expiryEpochMs: expiry_WRONG,
            }),
        ).toThrow()
        // expict wrong expiry (expiry_WRONG instead of expiryB_valid) to throw
        expect(() =>
            checkDelegateSig({
                delegatePubKey: delegateB.publicKey,
                creatorAddress: user.address,
                delegateSig: sigB,
                expiryEpochMs: expiry_WRONG,
            }),
        ).toThrow()
    })

    test('delegate-sig-2', async () => {
        const primary = keys[0]
        const primaryWallet = new ethers.Wallet(primary.privateKey)

        const delegate = keys[1]
        const delegateWallet = new ethers.Wallet(delegate.privateKey)
        log('delegate PublicKey', bin_toHexString(delegate.publicKey))
        const context = await makeSignerContext(primaryWallet, delegateWallet, 0n)
        const delegateSig = context.delegateSig
        expect(delegateSig).toBeDefined()
        log('OLD delegateSig', bin_toHexString(delegateSig!))

        expect(() =>
            checkDelegateSig({
                delegatePubKey: delegate.publicKey,
                creatorAddress: primary.address,
                delegateSig: delegateSig!,
                expiryEpochMs: 0n,
            }),
        ).not.toThrow()
    })

    const makeContext = async (
        userPrivateKey: string,
        delegatePrivateKey?: string,
    ): Promise<SignerContext> => {
        const userWallet = new ethers.Wallet(userPrivateKey)

        if (delegatePrivateKey === undefined) {
            return {
                signerPrivateKey: () => userPrivateKey,
                creatorAddress: bin_fromHexString(userWallet.address),
            }
        } else {
            const delegateWallet = new ethers.Wallet(delegatePrivateKey)
            return await makeSignerContext(userWallet, delegateWallet, { days: 1 })
        }
    }

    const testParams: [string, () => Promise<SignerContext>, () => Promise<SignerContext>][] = [
        // direct contexts are not recommended, but they are supported
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
                ...TEST_ENCRYPTED_MESSAGE_PROPS,
                ciphertext: 'Hello, World!',
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
            const event = await makeEvent(context, payload, hash)
            expect(await unpackEnvelope(event)).toBeDefined()

            // Event with same payload from different wallet doesn't match
            const event2 = await makeEvent(context2, payload, hash)
            expect(await unpackEnvelope(event2)).toBeDefined()
            expect(event2).not.toEqual(event)

            await expect(async () => {
                const e = _.cloneDeep(event)
                e.hash = event2.hash
                await unpackEnvelope(e)
            }).rejects.toThrow()

            await expect(async () => {
                const e = _.cloneDeep(event)
                e.signature = event2.signature
                await unpackEnvelope(e)
            }).rejects.toThrow()

            await expect(async () => {
                const e = _.cloneDeep(event)
                e.event = event2.event
                await unpackEnvelope(e)
            }).rejects.toThrow()

            // Event with same payload from the same wallet doesn't match
            const event3 = await makeEvent(context, payload, hash)
            expect(await unpackEnvelope(event3)).toBeDefined()
            expect(event3.hash).not.toEqual(event.hash)
            expect(event3).not.toEqual(event)
        },
    )

    test.each(testParams)(
        'validate-prev-events-%s',
        async (method: string, c: () => Promise<SignerContext>) => {
            const userStreamId = makeUserStreamId('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
            const context = await c()
            expect(
                await makeEvent(
                    context,
                    make_UserPayload_Inception({
                        streamId: streamIdToBytes(userStreamId),
                    }),
                ),
            ).toBeDefined()

            const payload: PlainMessage<StreamEvent>['payload'] = {
                case: 'channelPayload',
                value: {
                    content: {
                        case: 'message',
                        value: { ...TEST_ENCRYPTED_MESSAGE_PROPS, ciphertext: 'Hello, World!' },
                    },
                },
            }
            expect(await makeEvent(context, payload, hash)).toBeDefined()

            for (const h of badHashes) {
                await expect(makeEvent(context, payload, h)).rejects.toThrow()
            }
        },
    )
})
