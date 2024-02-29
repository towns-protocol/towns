import { EncryptionDelegate } from '../encryptionDelegate'
import debug from 'debug'
import { InboundGroupSession, OutboundGroupSession } from '../encryptionTypes'

const log = debug('test')

describe('Group Encryption Protocol', () => {
    let aliceSession: OutboundGroupSession | undefined
    let bobSession: InboundGroupSession | undefined
    let eveSession: InboundGroupSession | undefined

    afterAll(async () => {
        if (aliceSession !== undefined) {
            aliceSession.free()
            aliceSession = undefined
        }

        if (bobSession !== undefined) {
            bobSession.free()
            bobSession = undefined
        }

        if (eveSession !== undefined) {
            eveSession.free()
            eveSession = undefined
        }
    })

    test('noInitShouldFail', async () => {
        const delegate = new EncryptionDelegate()
        try {
            aliceSession = delegate.createOutboundGroupSession()
        } catch (e) {
            expect((e as Error).message).toEqual('olm not initialized')
        }
        expect(aliceSession).toBeUndefined()
    })

    test('shouldEncryptAndDecryptGroup', async () => {
        const delegate = new EncryptionDelegate()
        await delegate.init()
        aliceSession = delegate.createOutboundGroupSession()
        bobSession = delegate.createInboundGroupSession()
        eveSession = delegate.createInboundGroupSession()

        aliceSession.create()
        expect(aliceSession.message_index()).toEqual(0)
        bobSession.create(aliceSession.session_key())
        eveSession.create(aliceSession.session_key())

        let TEST_TEXT = 'alice test text'
        let encrypted = aliceSession.encrypt(TEST_TEXT)
        let decrypted = bobSession.decrypt(encrypted)
        log('bob decrypted ciphertext: ', decrypted)
        expect(decrypted.plaintext).toEqual(TEST_TEXT)
        expect(decrypted.message_index).toEqual(0)

        TEST_TEXT = 'alice test text: ='
        encrypted = aliceSession.encrypt(TEST_TEXT)
        decrypted = bobSession.decrypt(encrypted)
        log('bob decrypted ciphertext: ', decrypted)
        expect(decrypted.plaintext).toEqual(TEST_TEXT)
        expect(decrypted.message_index).toEqual(1)

        TEST_TEXT = '!'
        encrypted = aliceSession.encrypt(TEST_TEXT)
        decrypted = bobSession.decrypt(encrypted)
        log('bob decrypted ciphertext: ', decrypted)
        expect(decrypted.plaintext).toEqual(TEST_TEXT)
        expect(decrypted.message_index).toEqual(2)

        decrypted = eveSession.decrypt(encrypted)
        log('eve decrypted ciphertext: ', decrypted)
        expect(decrypted.plaintext).toEqual(TEST_TEXT)
        expect(decrypted.message_index).toEqual(2)
    })

    test('shouldEncryptAndDecryptGroupMultipleInit', async () => {
        const delegate = new EncryptionDelegate()
        await delegate.init()
        aliceSession = delegate.createOutboundGroupSession()
        bobSession = delegate.createInboundGroupSession()
        eveSession = delegate.createInboundGroupSession()

        aliceSession.create()
        expect(aliceSession.message_index()).toEqual(0)
        bobSession.create(aliceSession.session_key())
        eveSession.create(aliceSession.session_key())

        await delegate.init()
        let TEST_TEXT = 'alice test text'
        let encrypted = aliceSession.encrypt(TEST_TEXT)
        let decrypted = bobSession.decrypt(encrypted)
        log('bob decrypted ciphertext: ', decrypted)
        expect(decrypted.plaintext).toEqual(TEST_TEXT)
        expect(decrypted.message_index).toEqual(0)

        await delegate.init()
        TEST_TEXT = 'alice test text: ='
        encrypted = aliceSession.encrypt(TEST_TEXT)
        decrypted = bobSession.decrypt(encrypted)
        log('bob decrypted ciphertext: ', decrypted)
        expect(decrypted.plaintext).toEqual(TEST_TEXT)
        expect(decrypted.message_index).toEqual(1)

        await delegate.init()
        TEST_TEXT = '!'
        encrypted = aliceSession.encrypt(TEST_TEXT)
        decrypted = bobSession.decrypt(encrypted)
        log('bob decrypted ciphertext: ', decrypted)
        expect(decrypted.plaintext).toEqual(TEST_TEXT)
        expect(decrypted.message_index).toEqual(2)

        await delegate.init()
        decrypted = eveSession.decrypt(encrypted)
        log('eve decrypted ciphertext: ', decrypted)
        expect(decrypted.plaintext).toEqual(TEST_TEXT)
        expect(decrypted.message_index).toEqual(2)
    })
})
