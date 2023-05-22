import { OlmMegolmDelegate } from '../src/olm'
import debug from 'debug'

const log = debug('test')

describe('Pk Signing and Encryption', () => {
    let encryption: Olm.PkEncryption | undefined
    let decryption: Olm.PkDecryption | undefined
    let signing: Olm.PkSigning | undefined
    let OlmDelegate: OlmMegolmDelegate | undefined

    beforeEach(async () => {
        OlmDelegate = new OlmMegolmDelegate()
        await OlmDelegate.init()
        // create a key pair for encryption
        encryption = await OlmDelegate.createPkEncryption()
        // create a key pair for decryption
        decryption = await OlmDelegate.createPkDecryption()
        signing = await OlmDelegate.createPkSigning()
    })

    afterEach(async () => {
        if (encryption !== undefined) {
            encryption.free()
            encryption = undefined
        }

        if (decryption !== undefined) {
            decryption.free()
            decryption = undefined
        }
    })

    test('shouldImportAndExportKeysFromPrivateParts', async () => {
        if (encryption === undefined || decryption === undefined) {
            throw new Error('key pairs not initialized')
        }
        const alice_private = new Uint8Array([
            0x77, 0x07, 0x6d, 0x0a, 0x73, 0x18, 0xa5, 0x7d, 0x3c, 0x16, 0xc1, 0x72, 0x51, 0xb2,
            0x66, 0x45, 0xdf, 0x4c, 0x2f, 0x87, 0xeb, 0xc0, 0x99, 0x2a, 0xb1, 0x77, 0xfb, 0xa5,
            0x1d, 0xb9, 0x2c, 0x2a,
        ])
        const alice_public = decryption.init_with_private_key(alice_private)
        expect(alice_public).toEqual('hSDwCYkwp1R0i33ctD73Wg2/Og0mOBr066SpjqqbTmo')
        const alice_private_out = decryption.get_private_key()
        expect(alice_private_out).toEqual(alice_private)
    })

    test('shouldEncryptAndDecrypt', async () => {
        if (encryption === undefined || decryption === undefined) {
            throw new Error('key pairs not initialized')
        }
        let TEST_TEXT = 'test text'
        let pubkey = decryption.generate_key()
        encryption.set_recipient_key(pubkey)
        let encrypted = encryption.encrypt(TEST_TEXT)
        let decrypted = decryption.decrypt(encrypted.ephemeral, encrypted.mac, encrypted.ciphertext)
        log('decrypted ciphertext: ', decrypted)
        expect(decrypted).toEqual(TEST_TEXT)

        TEST_TEXT = 'test text: ='
        encryption.set_recipient_key(pubkey)
        encrypted = encryption.encrypt(TEST_TEXT)
        decrypted = decryption.decrypt(encrypted.ephemeral, encrypted.mac, encrypted.ciphertext)
        log('decrypted ciphertext: ', decrypted)
        expect(decrypted).toEqual(TEST_TEXT)
    })

    test('shouldPickleAndUnpickleKey', async () => {
        if (encryption === undefined || decryption === undefined || OlmDelegate === undefined) {
            throw new Error('key pairs not initialized')
        }
        let TEST_TEXT = 'test text'
        let pubkey = decryption.generate_key()
        encryption.set_recipient_key(pubkey)
        let encrypted = encryption.encrypt(TEST_TEXT)

        let PICKLE_KEY = 'secret_key'
        let pickle = decryption.pickle(PICKLE_KEY)

        let new_decryption = await OlmDelegate.createPkDecryption()
        let new_pubkey = new_decryption.unpickle(PICKLE_KEY, pickle)
        expect(new_pubkey).toEqual(pubkey)
        let decrypted = new_decryption.decrypt(
            encrypted.ephemeral,
            encrypted.mac,
            encrypted.ciphertext,
        )
        log('decrypted ciphertext: ', decrypted)
        expect(decrypted).toEqual(TEST_TEXT)
        new_decryption.free()
    })

    test('shouldSignAndVerify', async () => {
        if (signing === undefined || OlmDelegate === undefined) {
            throw new Error('key pairs not initialized')
        }
        const seed = new Uint8Array([
            0x77, 0x07, 0x6d, 0x0a, 0x73, 0x18, 0xa5, 0x7d, 0x3c, 0x16, 0xc1, 0x72, 0x51, 0xb2,
            0x66, 0x45, 0xdf, 0x4c, 0x2f, 0x87, 0xeb, 0xc0, 0x99, 0x2a, 0xb1, 0x77, 0xfb, 0xa5,
            0x1d, 0xb9, 0x2c, 0x2a,
        ])
        const TEST_TEXT = 'I am attesting to this text'
        const pubkey = signing.init_with_seed(seed)
        const sig = signing.sign(TEST_TEXT)
        const util = await OlmDelegate.createOlmUtil()
        util.ed25519_verify(pubkey, TEST_TEXT, sig)
        let verifyFailure = null
        try {
            util.ed25519_verify(pubkey, TEST_TEXT, 'p' + sig.slice(1))
        } catch (e) {
            verifyFailure = e
        }
        expect(verifyFailure).not.toBeNull()
        util.free()
    })
})
