import { EncryptionDelegate } from '../encryptionDelegate'

describe('EncryptionDelegate with group session', () => {
    const delegate = new EncryptionDelegate()

    beforeEach(async () => {
        await delegate.init()
    })

    test('decrypt messages out of order', async () => {
        const outboundSession = delegate.createOutboundGroupSession()
        outboundSession.create()

        const exportedSession = outboundSession.session_key()
        const inboundSession = delegate.createInboundGroupSession()
        inboundSession.create(exportedSession)

        const encrypted1 = outboundSession.encrypt('message 1')
        const decrypted1 = inboundSession.decrypt(encrypted1)
        expect(decrypted1.plaintext).toEqual('message 1')

        const encrypted3 = outboundSession.encrypt('message 3')

        const decrypted3 = inboundSession.decrypt(encrypted3)
        expect(decrypted3.plaintext).toEqual('message 3')

        const decrypted2 = inboundSession.decrypt(encrypted3)
        expect(decrypted2.plaintext).toEqual('message 3')
    })
})
