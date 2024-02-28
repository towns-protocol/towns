import { EncryptionDelegate } from '../encryptionDelegate'
import { Account } from '../encryptionTypes'

describe('EncrytionDelegate', () => {
    const delegate = new EncryptionDelegate()
    let bob: Account
    let alice: Account

    beforeEach(async () => {
        await delegate.init()
        bob = delegate.createAccount()
        alice = delegate.createAccount()
        bob.create()
        alice.create()
    })

    function getFallbackKey(account: Account): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return Object.values(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            JSON.parse(account.unpublished_fallback_key())['curve25519'],
        )[0] as string
    }

    function getIdentityKey(account: Account): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return JSON.parse(account.identity_keys()).curve25519
    }

    test('encrypt decrypt', async () => {
        alice.generate_fallback_key()
        const aliceFallbackKey = getFallbackKey(alice)
        const aliceIdentityKey = getIdentityKey(alice)
        const bobToAlice = delegate.createSession()
        bobToAlice.create_outbound(bob, aliceIdentityKey, aliceFallbackKey)

        const encrypted = bobToAlice.encrypt('bob to alice 1')
        const aliceToBob = delegate.createSession()
        aliceToBob.create_inbound(alice, encrypted.body)
        const decrypted = aliceToBob.decrypt(encrypted.type, encrypted.body)
        expect(decrypted).toEqual('bob to alice 1')

        const encrypted2 = aliceToBob.encrypt('alice to bob 1')
        const decrypted2 = bobToAlice.decrypt(encrypted2.type, encrypted2.body)
        expect(decrypted2).toEqual('alice to bob 1')
    })

    test('decrypt same message twice', async () => {
        alice.generate_fallback_key()
        const aliceFallbackKey = getFallbackKey(alice)
        const aliceIdentityKey = getIdentityKey(alice)
        const bobToAlice = delegate.createSession()
        bobToAlice.create_outbound(bob, aliceIdentityKey, aliceFallbackKey)

        const encrypted = bobToAlice.encrypt('bob to alice 1')
        const aliceToBob = delegate.createSession()
        aliceToBob.create_inbound(alice, encrypted.body)
        expect(aliceToBob.decrypt(encrypted.type, encrypted.body)).toEqual('bob to alice 1')

        const aliceToBob2 = delegate.createSession()
        aliceToBob2.create_inbound(alice, encrypted.body)
        expect(aliceToBob2.decrypt(encrypted.type, encrypted.body)).toEqual('bob to alice 1')
    })

    test('decrypt same message twice throws', async () => {
        alice.generate_fallback_key()
        const aliceFallbackKey = getFallbackKey(alice)
        const aliceIdentityKey = getIdentityKey(alice)
        const bobToAlice = delegate.createSession()
        bobToAlice.create_outbound(bob, aliceIdentityKey, aliceFallbackKey)

        const encrypted = bobToAlice.encrypt('bob to alice 1')
        const aliceToBob = delegate.createSession()
        aliceToBob.create_inbound(alice, encrypted.body)
        expect(aliceToBob.decrypt(encrypted.type, encrypted.body)).toEqual('bob to alice 1')
        expect(() => aliceToBob.decrypt(encrypted.type, encrypted.body)).toThrow()
    })

    test('decrypt same messages out of order', async () => {
        alice.generate_fallback_key()
        const aliceFallbackKey = getFallbackKey(alice)
        const aliceIdentityKey = getIdentityKey(alice)
        const bobToAlice = delegate.createSession()
        bobToAlice.create_outbound(bob, aliceIdentityKey, aliceFallbackKey)

        const encrypted1 = bobToAlice.encrypt('bob to alice 1')
        const encrypted2 = bobToAlice.encrypt('bob to alice 2')

        const aliceToBob = delegate.createSession()
        aliceToBob.create_inbound(alice, encrypted2.body)
        expect(aliceToBob.decrypt(encrypted2.type, encrypted2.body)).toEqual('bob to alice 2')
        expect(aliceToBob.decrypt(encrypted1.type, encrypted1.body)).toEqual('bob to alice 1')
    })
})
