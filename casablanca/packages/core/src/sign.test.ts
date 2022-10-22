import { ecsign, hashPersonalMessage, publicToAddress, toRpcSig } from '@ethereumjs/util'
import { personalSign } from '@metamask/eth-sig-util'
import { Wallet } from 'ethers'
import _ from 'lodash'
import { checkDelegateSig, checkEvent, makeDelegateSig, makeEvent, SignerContext } from './sign'
import { Payload, StreamKind } from './types'

describe('sign', () => {
    const msg = 'Hello, World!'
    const privateKey = '0123456789012345678901234567890123456789012345678901234567890123'
    const privateKey2 = '0123456789012345678901234567890123456789012345678901234567890124'
    const primaryPrivateKey = '0123456789012345678901234567890123456789012345678901234567890125'
    const hash = '0x8dc27dbd6fc775e3a05c509c6eb1c63c4ab5bc6e7010bf9a9a80a42ae1ea56b0'
    const badHashes = [
        '0x8Dc27dbd6fc775e3a05c509c6eb1c63c4ab5bc6e7010bf9a9a80a42ae1ea56b0',
        '0x8dc27dbd6fc775e3a05c509c6eb1c63c4ab5bc6e7010bf9a9a80a42ae1ea56b00',
        '0x8dc27dbd6fc775e3a05c509c6eb1c63c4ab5bc6e7010bf9a9a80a42ae1ea56b',
    ]

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
        const zionWallet1 = new Wallet(privateKey)
        const zionWallet2 = new Wallet(privateKey2)
        const primaryWallet = new Wallet(primaryPrivateKey)

        const sig1 = await makeDelegateSig(primaryWallet, zionWallet1)
        const sig2 = await makeDelegateSig(primaryWallet, zionWallet2)
        expect(sig1).not.toEqual(sig2)

        expect(() =>
            checkDelegateSig(zionWallet1.publicKey, primaryWallet.address, sig1),
        ).not.toThrow()
        expect(() =>
            checkDelegateSig(zionWallet2.publicKey, primaryWallet.address, sig2),
        ).not.toThrow()

        expect(() => checkDelegateSig(zionWallet2.publicKey, primaryWallet.address, sig1)).toThrow()
        expect(() => checkDelegateSig(zionWallet1.publicKey, zionWallet2.address, sig1)).toThrow()
        expect(() => checkDelegateSig(zionWallet1.publicKey, primaryWallet.address, sig2)).toThrow()
        publicToAddress
    })

    const makeContext = async (
        privateKey: string,
        primaryPrivateKey?: string,
    ): Promise<SignerContext> => {
        const wallet = new Wallet(privateKey)
        if (primaryPrivateKey === undefined) {
            return { wallet, creatorAddress: wallet.address }
        } else {
            const primaryWallet = new Wallet(primaryPrivateKey)
            return {
                wallet,
                creatorAddress: primaryWallet.address,
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

            const payload: Payload = { kind: 'message', text: msg }
            const event = makeEvent(context, payload, [hash])
            checkEvent(event, null)

            // Event with same payload from different wallet doesn't match
            const event2 = makeEvent(context2, payload, [hash])
            checkEvent(event2, null)
            expect(event2).not.toEqual(event)

            expect(() => {
                const e = _.cloneDeep(event)
                e.hash = event2.hash
                checkEvent(e, null)
            }).toThrow()

            expect(() => {
                const e = _.cloneDeep(event)
                e.signature = event2.signature
                checkEvent(e, null)
            }).toThrow()

            if (method === 'direct') {
                expect(() => {
                    const e = _.cloneDeep(event)
                    e.base.creatorAddress = event2.base.creatorAddress
                    checkEvent(e, null)
                }).toThrow()
            }

            // Event with same payload from the same wallet doesn't match
            const event3 = makeEvent(context, payload, [hash])
            checkEvent(event3, null)
            expect(event3.hash).not.toEqual(event.hash)
            expect(event3).not.toEqual(event)
        },
    )

    test.each(testParams)(
        'validate-prev-events-%s',
        async (method: string, c: () => Promise<SignerContext>) => {
            const context = await c()
            makeEvent(
                context,
                { kind: 'inception', streamId: '0x22', data: { streamKind: StreamKind.User } },
                [],
            )

            const payload: Payload = { kind: 'message', text: msg }
            makeEvent(context, payload, [hash])
            makeEvent(context, payload, [hash, hash, hash])

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
