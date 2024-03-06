/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { EncryptionDelegate } from '../encryptionDelegate'
import debug from 'debug'
import { Account, Session } from '../encryptionTypes'

const log = debug('test')

describe('Encryption Protocol', () => {
    let aliceAccount: Account | undefined
    let bobAccount: Account | undefined
    let aliceSession: Session | undefined
    let bobSession: Session | undefined

    beforeAll(async () => {
        const delegate = new EncryptionDelegate()
        await delegate.init()
        aliceAccount = delegate.createAccount()
        bobAccount = delegate.createAccount()
        aliceSession = delegate.createSession()
        bobSession = delegate.createSession()
    })

    afterAll(async () => {
        if (aliceAccount !== undefined) {
            aliceAccount.free()
            aliceAccount = undefined
        }

        if (bobAccount !== undefined) {
            bobAccount.free()
            bobAccount = undefined
        }

        if (aliceSession !== undefined) {
            aliceSession.free()
            aliceSession = undefined
        }

        if (bobSession !== undefined) {
            bobSession.free()
            bobSession = undefined
        }
    })

    test('shouldEncryptAndDecrypt', async () => {
        if (
            aliceAccount === undefined ||
            bobAccount === undefined ||
            aliceSession === undefined ||
            bobSession === undefined
        ) {
            throw new Error('Account and Session objects not initialized')
        }
        aliceAccount.create()
        bobAccount.create()

        // public one time key for pre-key message generation to establish the session
        bobAccount.generate_one_time_keys(2)
        const bobOneTimeKeys = JSON.parse(bobAccount.one_time_keys()).curve25519
        log('bobOneTimeKeys', bobOneTimeKeys)
        bobAccount.mark_keys_as_published()

        const bobIdKey = JSON.parse(bobAccount?.identity_keys()).curve25519
        const otkId = Object.keys(bobOneTimeKeys)[0]
        // create outbound sessions using bob's one time key
        aliceSession.create_outbound(aliceAccount, bobIdKey, bobOneTimeKeys[otkId])
        let TEST_TEXT = 'test message for bob'
        let encrypted = aliceSession.encrypt(TEST_TEXT)
        expect(encrypted.type).toEqual(0)

        // create inbound sessions using own account and encrypted body from alice
        bobSession.create_inbound(bobAccount, encrypted.body)
        bobAccount.remove_one_time_keys(bobSession)

        let decrypted = bobSession.decrypt(encrypted.type, encrypted.body)
        log('bob decrypted ciphertext: ', decrypted)
        expect(decrypted).toEqual(TEST_TEXT)

        TEST_TEXT = 'test message for alice'
        encrypted = bobSession.encrypt(TEST_TEXT)
        expect(encrypted.type).toEqual(1)
        decrypted = aliceSession.decrypt(encrypted.type, encrypted.body)
        log('alice decrypted ciphertext: ', decrypted)
        expect(decrypted).toEqual(TEST_TEXT)
    })

    test('shouldEncryptAndDecryptWithFallbackKey', async () => {
        if (
            aliceAccount === undefined ||
            bobAccount === undefined ||
            aliceSession === undefined ||
            bobSession === undefined
        ) {
            throw new Error('Account and session objects not initialized')
        }
        aliceAccount.create()
        bobAccount.create()

        // public fallback key for pre-key message generation to establish the session
        bobAccount.generate_fallback_key()
        const bobFallbackKey = JSON.parse(bobAccount.unpublished_fallback_key()).curve25519
        log('bobFallbackKeys', bobFallbackKey)

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const bobIdKey = JSON.parse(bobAccount?.identity_keys()).curve25519
        const otkId = Object.keys(bobFallbackKey)[0]
        // create outbound sessions using bob's fallback key
        aliceSession.create_outbound(aliceAccount, bobIdKey, bobFallbackKey[otkId])
        let TEST_TEXT = 'test message for bob'
        let encrypted = aliceSession.encrypt(TEST_TEXT)
        expect(encrypted.type).toEqual(0)
        log('aliceSession sessionId', aliceSession.session_id())

        // create inbound sessions using own account and encrypted body from alice
        bobSession.create_inbound(bobAccount, encrypted.body)

        let decrypted = bobSession.decrypt(encrypted.type, encrypted.body)
        log('bob decrypted ciphertext: ', decrypted)
        expect(decrypted).toEqual(TEST_TEXT)

        TEST_TEXT = 'test message for alice'
        encrypted = bobSession.encrypt(TEST_TEXT)
        expect(encrypted.type).toEqual(1)
        decrypted = aliceSession.decrypt(encrypted.type, encrypted.body)
        log('alice decrypted ciphertext: ', decrypted)
        expect(decrypted).toEqual(TEST_TEXT)

        // Sep 2: encrypt with same session as pre-key message
        log('aliceSession sessionId', aliceSession.session_id())
        const TEST_TEXT_2 = 'test message for bob 2'
        aliceSession.create_outbound(aliceAccount, bobIdKey, bobFallbackKey[otkId])
        const encrypted_2 = aliceSession.encrypt(TEST_TEXT_2)
        expect(encrypted_2.type).toEqual(0)
        bobSession.create_inbound(bobAccount, encrypted_2.body)
        const decrypted_2 = bobSession.decrypt(encrypted_2.type, encrypted_2.body)
        log('bob decrypted ciphertext 2: ', decrypted_2)
        expect(decrypted_2).toEqual(TEST_TEXT_2)
    })

    test('shouldNotEncryptAndDecryptWithBadFallbackKey', async () => {
        if (
            aliceAccount === undefined ||
            bobAccount === undefined ||
            aliceSession === undefined ||
            bobSession === undefined
        ) {
            throw new Error('Account and session objects not initialized')
        }
        aliceAccount.create()
        bobAccount.create()

        // public fallback key for pre-key message generation to establish the session
        aliceAccount.generate_fallback_key()
        const aliceFallbackKey = JSON.parse(aliceAccount.unpublished_fallback_key()).curve25519
        log('aliceFallbackKey', aliceFallbackKey)

        const bobIdKey = JSON.parse(bobAccount?.identity_keys()).curve25519
        const aliceIdKey = JSON.parse(aliceAccount?.identity_keys()).curve25519
        const otkId = Object.keys(aliceFallbackKey)[0]
        // create outbound sessions using alice's fallback key (should fail)
        aliceSession.create_outbound(aliceAccount, bobIdKey, aliceFallbackKey[otkId])
        const TEST_TEXT = 'test message for bob'
        const encrypted = aliceSession.encrypt(TEST_TEXT)
        expect(encrypted.type).toEqual(0)
        log('aliceSession sessionId', aliceSession.session_id())

        // create inbound sessions using own account and encrypted body from alice
        // this should fail as outbound session was not created using bob's fallback key
        try {
            bobSession.create_inbound_from(bobAccount, aliceIdKey, encrypted.body)
            bobSession.decrypt(encrypted.type, encrypted.body)
        } catch (e) {
            log('bobSession.create_inbound_from failed as expected', e)
            expect((e as Error).message).toContain('OLM.BAD_MESSAGE_KEY_ID')
            return
        }
        // we shouldn't get here
        expect(true).toEqual(false)
    })
})
