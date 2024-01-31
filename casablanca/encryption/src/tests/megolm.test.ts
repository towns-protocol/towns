import { OlmMegolmDelegate } from '../olm'
import debug from 'debug'

const log = debug('test')

describe('Megolm Encryption Protocol', () => {
    let aliceSession: Olm.OutboundGroupSession | undefined
    let bobSession: Olm.InboundGroupSession | undefined
    let eveSession: Olm.InboundGroupSession | undefined

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
        const OlmDelegate = new OlmMegolmDelegate()
        try {
            aliceSession = OlmDelegate.createOutboundGroupSession()
        } catch (e) {
            expect((e as Error).message).toEqual('olm not initialized')
        }
        expect(aliceSession).toBeUndefined()
    })

    test('shouldEncryptAndDecryptGroup', async () => {
        const OlmDelegate = new OlmMegolmDelegate()
        await OlmDelegate.init()
        aliceSession = OlmDelegate.createOutboundGroupSession()
        bobSession = OlmDelegate.createInboundGroupSession()
        eveSession = OlmDelegate.createInboundGroupSession()

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
        const OlmDelegate = new OlmMegolmDelegate()
        await OlmDelegate.init()
        aliceSession = OlmDelegate.createOutboundGroupSession()
        bobSession = OlmDelegate.createInboundGroupSession()
        eveSession = OlmDelegate.createInboundGroupSession()

        aliceSession.create()
        expect(aliceSession.message_index()).toEqual(0)
        bobSession.create(aliceSession.session_key())
        eveSession.create(aliceSession.session_key())

        await OlmDelegate.init()
        let TEST_TEXT = 'alice test text'
        let encrypted = aliceSession.encrypt(TEST_TEXT)
        let decrypted = bobSession.decrypt(encrypted)
        log('bob decrypted ciphertext: ', decrypted)
        expect(decrypted.plaintext).toEqual(TEST_TEXT)
        expect(decrypted.message_index).toEqual(0)

        await OlmDelegate.init()
        TEST_TEXT = 'alice test text: ='
        encrypted = aliceSession.encrypt(TEST_TEXT)
        decrypted = bobSession.decrypt(encrypted)
        log('bob decrypted ciphertext: ', decrypted)
        expect(decrypted.plaintext).toEqual(TEST_TEXT)
        expect(decrypted.message_index).toEqual(1)

        await OlmDelegate.init()
        TEST_TEXT = '!'
        encrypted = aliceSession.encrypt(TEST_TEXT)
        decrypted = bobSession.decrypt(encrypted)
        log('bob decrypted ciphertext: ', decrypted)
        expect(decrypted.plaintext).toEqual(TEST_TEXT)
        expect(decrypted.message_index).toEqual(2)

        await OlmDelegate.init()
        decrypted = eveSession.decrypt(encrypted)
        log('eve decrypted ciphertext: ', decrypted)
        expect(decrypted.plaintext).toEqual(TEST_TEXT)
        expect(decrypted.message_index).toEqual(2)
    })
})
