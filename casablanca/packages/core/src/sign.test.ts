import { ecsign, hashPersonalMessage, toRpcSig } from '@ethereumjs/util'
import { personalSign } from '@metamask/eth-sig-util'
import { Wallet } from 'ethers'
import _ from 'lodash'
import { checkEvent, makeEvent } from './sign'
import { Payload, StreamKind } from './types'

describe('sign', () => {
    const msg = 'Hello, World!'
    const privateKey = '0123456789012345678901234567890123456789012345678901234567890123'
    const privateKey2 = '0123456789012345678901234567890123456789012345678901234567890124'
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

    test('sign-and-verify', async () => {
        const wallet = new Wallet(privateKey)
        const payload: Payload = { kind: 'message', text: msg }
        const event = makeEvent(wallet, payload, [hash])
        checkEvent(event, null)

        // Event with same payload from different wallet doesn't match
        const wallet2 = new Wallet(privateKey2)
        const event2 = makeEvent(wallet2, payload, [hash])
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

        expect(() => {
            const e = _.cloneDeep(event)
            e.base.creatorAddress = event2.base.creatorAddress
            checkEvent(e, null)
        }).toThrow()

        // Event with same payload from the same wallet doesn't match
        const event3 = makeEvent(wallet, payload, [hash])
        checkEvent(event3, null)
        expect(event3.hash).not.toEqual(event.hash)
        expect(event3).not.toEqual(event)
    })

    test('validate-prev-events', async () => {
        const wallet = new Wallet(privateKey)

        makeEvent(
            wallet,
            { kind: 'inception', streamId: '0x22', data: { streamKind: StreamKind.User } },
            [],
        )

        const payload: Payload = { kind: 'message', text: msg }
        makeEvent(wallet, payload, [hash])
        makeEvent(wallet, payload, [hash, hash, hash])

        badHashes.forEach((h) => {
            expect(() => {
                makeEvent(wallet, payload, [h])
            }).toThrow()
        })

        badHashes.forEach((h) => {
            expect(() => {
                makeEvent(wallet, payload, [hash, h])
            }).toThrow()
        })
    })
})
