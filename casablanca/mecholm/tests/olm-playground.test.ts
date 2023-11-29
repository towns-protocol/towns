import { OlmMegolmDelegate } from '../src/olm'

describe('OlmPlayground', () => {
    const OlmDelegate = new OlmMegolmDelegate()
    let bob: Olm.Account
    let alice: Olm.Account

    beforeEach(async () => {
        await OlmDelegate.init()
        bob = OlmDelegate.createAccount()
        alice = OlmDelegate.createAccount()
        bob.create()
        alice.create()
    })
    function getFallbackKey(account: Olm.Account): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        return Object.values(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            JSON.parse(account.unpublished_fallback_key())['curve25519'],
        )[0] as string
    }

    function getIdentityKey(account: Olm.Account): string {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return JSON.parse(account.identity_keys()).curve25519
    }

    test('encrypt decrypt', async () => {
        alice.generate_fallback_key()
        const aliceFallbackKey = getFallbackKey(alice)
        const aliceIdentityKey = getIdentityKey(alice)
        const bobToAlice = OlmDelegate.createSession()
        bobToAlice.create_outbound(bob, aliceIdentityKey, aliceFallbackKey)

        const encrypted = bobToAlice.encrypt('bob to alice 1')
        const aliceToBob = OlmDelegate.createSession()
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
        const bobToAlice = OlmDelegate.createSession()
        bobToAlice.create_outbound(bob, aliceIdentityKey, aliceFallbackKey)

        const encrypted = bobToAlice.encrypt('bob to alice 1')
        const aliceToBob = OlmDelegate.createSession()
        aliceToBob.create_inbound(alice, encrypted.body)
        expect(aliceToBob.decrypt(encrypted.type, encrypted.body)).toEqual('bob to alice 1')

        const aliceToBob2 = OlmDelegate.createSession()
        aliceToBob2.create_inbound(alice, encrypted.body)
        expect(aliceToBob2.decrypt(encrypted.type, encrypted.body)).toEqual('bob to alice 1')
    })

    test('decrypt same message twice throws', async () => {
        alice.generate_fallback_key()
        const aliceFallbackKey = getFallbackKey(alice)
        const aliceIdentityKey = getIdentityKey(alice)
        const bobToAlice = OlmDelegate.createSession()
        bobToAlice.create_outbound(bob, aliceIdentityKey, aliceFallbackKey)

        const encrypted = bobToAlice.encrypt('bob to alice 1')
        const aliceToBob = OlmDelegate.createSession()
        aliceToBob.create_inbound(alice, encrypted.body)
        expect(aliceToBob.decrypt(encrypted.type, encrypted.body)).toEqual('bob to alice 1')
        expect(() => aliceToBob.decrypt(encrypted.type, encrypted.body)).toThrow()
    })
})
