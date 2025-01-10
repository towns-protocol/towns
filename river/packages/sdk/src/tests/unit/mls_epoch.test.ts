/**
 * @group main
 */

import { beforeEach, describe, expect } from 'vitest'
import { CipherSuite } from '@river-build/mls-rs-wasm'
import { dlog } from '@river-build/dlog'
import {
    EpochSecret,
    EpochSecretService,
    IEpochSecretStore,
    InMemoryEpochSecretStore,
} from '../../mls/epoch'
import { EncryptedData } from '@river-build/proto'

const log = dlog('test:mls:epoch')

const encoder = new TextEncoder()

describe('mlsEpochTests', () => {
    let epochStore: IEpochSecretStore
    let epochService: EpochSecretService
    const cipherSuite = new CipherSuite()
    const secret = encoder.encode('secret')
    const epoch = 1n
    const streamId = 'stream'

    beforeEach(() => {
        epochStore = new InMemoryEpochSecretStore(log.extend('store'))
        epochService = new EpochSecretService(cipherSuite, epochStore, log.extend('service'))
    })

    it('shouldCreateEpochSecretService', () => {
        expect(cipherSuite).toBeDefined()
        expect(epochStore).toBeDefined()
        expect(epochService).toBeDefined()
    })

    it('shouldStartEmpty', async () => {
        const epochSecret = epochService.getEpochSecret(streamId, epoch)
        expect(epochSecret).toBeUndefined()
    })

    it('shouldAddOpenEpochSecret', async () => {
        await epochService.addOpenEpochSecret(streamId, epoch, secret)
        const epochSecret = epochService.getEpochSecret(streamId, epoch)
        expect(epochSecret).toBeDefined()
    })

    it('shouldAddClosedEpochSecret', async () => {
        await epochService.addAnnouncedSealedEpochSecret(streamId, epoch, secret)
        const epochSecret = epochService.getEpochSecret(streamId, epoch)
        expect(epochSecret).toBeDefined()
    })

    describe('openEpochSecret', () => {
        let epochSecret: EpochSecret

        beforeEach(async () => {
            await epochService.addOpenEpochSecret(streamId, epoch, secret)
            epochSecret = epochService.getEpochSecret(streamId, epoch)!
            expect(epochSecret).toBeDefined()
        })

        it('shouldStartOpen', () => {
            expect(epochSecret.sealedEpochSecret).toBeUndefined()
        })

        it('shouldStartDerived', () => {
            expect(epochSecret.derivedKeys).toBeDefined()
        })

        it('shouldStartNotAnnounced', () => {
            expect(epochSecret.announced).toBeFalsy()
        })

        it('shouldSealEpochSecret', async () => {
            const epoch2 = 2n
            const secret2 = encoder.encode('secret2')

            await epochService.addOpenEpochSecret(streamId, epoch2, secret2)

            const epochSecret2 = epochService.getEpochSecret(streamId, epoch2)!
            expect(epochSecret2).toBeDefined()
            expect(epochSecret2.derivedKeys).toBeDefined()
            await epochService.sealEpochSecret(epochSecret, epochSecret2.derivedKeys!)

            epochSecret = epochService.getEpochSecret(streamId, epoch)!
            expect(epochSecret.sealedEpochSecret).toBeDefined()
        })
    })

    describe('sealedEpochSecret', () => {
        let epochStore2: IEpochSecretStore
        let epochService2: EpochSecretService

        let epochSecret: EpochSecret
        let epochSecret2: EpochSecret

        const epoch2 = 2n
        const secret2 = encoder.encode('secret2')

        // Create another service that seals it's epoch secret and gives us
        beforeEach(async () => {
            epochStore2 = new InMemoryEpochSecretStore(log.extend('store2'))
            epochService2 = new EpochSecretService(cipherSuite, epochStore2, log.extend('service2'))

            await epochService2.addOpenEpochSecret(streamId, epoch, secret)
            await epochService2.addOpenEpochSecret(streamId, epoch2, secret2)

            epochSecret = epochService2.getEpochSecret(streamId, epoch)!
            epochSecret2 = epochService2.getEpochSecret(streamId, epoch2)!

            await epochService2.sealEpochSecret(epochSecret, epochSecret2.derivedKeys!)

            epochSecret = epochService2.getEpochSecret(streamId, epoch)!

            await epochService.addAnnouncedSealedEpochSecret(
                streamId,
                epoch,
                epochSecret.sealedEpochSecret!,
            )
            epochSecret = epochService.getEpochSecret(streamId, epoch)!
        })

        it('shouldStartSealed', () => {
            expect(epochSecret.sealedEpochSecret).toBeDefined()
        })

        it('shouldStartAnnounced', () => {
            expect(epochSecret.announced).toBeTruthy()
        })

        it('canBeOpenedWithDerivedKeys', async () => {
            await epochService.openSealedEpochSecret(epochSecret, epochSecret2.derivedKeys!)
        })

        it('cannotBeOpenedWithWrongDerivedKeys', async () => {
            const wrongSecret = encoder.encode('wrongSecret')
            await epochService.addOpenEpochSecret(streamId, epoch2, wrongSecret)
            epochSecret2 = epochService.getEpochSecret(streamId, epoch2)!
            await expect(
                epochService.openSealedEpochSecret(epochSecret, epochSecret2.derivedKeys!),
            ).rejects.toThrow()
        })
    })

    describe('messageEncryption', () => {
        let epochSecret: EpochSecret
        let message: EncryptedData

        beforeEach(async () => {
            await epochService.addOpenEpochSecret(streamId, epoch, secret)
            epochSecret = epochService.getEpochSecret(streamId, epoch)!
            expect(epochSecret).toBeDefined()
            const plaintext = encoder.encode('message')
            message = await epochService.encryptMessage(epochSecret, plaintext)
        })

        // encrypting message
        it('shouldEncryptMessage', async () => {
            expect(message).toBeDefined()
        })

        it('shouldDecryptMessage', async () => {
            const plaintext_ = await epochService.decryptMessage(epochSecret, message)
            const plaintext = new TextDecoder().decode(plaintext_)

            expect(plaintext).toEqual('message')
        })

        it('shouldFailToDecryptMessageWithWrongEpoch', async () => {
            const secret2 = encoder.encode('secret2')
            await epochService.addOpenEpochSecret(streamId, epoch + 1n, secret2)
            const epochSecret2 = epochService.getEpochSecret(streamId, epoch + 1n)!
            await expect(epochService.decryptMessage(epochSecret2, message)).rejects.toThrow()
        })

        it('shouldFailToDecryptMessageWithWrongSecret', async () => {
            const secret2 = encoder.encode('secret2')
            // update the epoch secret
            await epochService.addOpenEpochSecret(streamId, epoch, secret2)
            epochSecret = epochService.getEpochSecret(streamId, epoch)!

            await expect(epochService.decryptMessage(epochSecret, message)).rejects.toThrow()
        })
    })

    describe('epochSecretStorage', () => {
        beforeEach(async () => {
            await epochService.addOpenEpochSecret(streamId, epoch, secret)
            epochService = new EpochSecretService(cipherSuite, epochStore, log.extend('service2'))
        })

        it('shouldLoadEpochSecretFromStorage', async () => {
            let epochSecret = epochService.getEpochSecret(streamId, epoch)!
            expect(epochSecret).toBeUndefined()

            epochSecret = (await epochService.loadEpochSecret(streamId, epoch))!
            expect(epochSecret).toBeDefined()

            expect(epochSecret.openEpochSecret).toStrictEqual(secret)
        })
    })
})
