import {
    CipherSuite as MlsCipherSuite,
    HpkeCiphertext,
    HpkePublicKey,
    HpkeSecretKey,
    Secret as MlsSecret,
} from '@river-build/mls-rs-wasm'
import { bin_toHexString, DLogger, shortenHexString } from '@river-build/dlog'
import { DerivedKeys, EpochSecret, EpochSecretId, epochSecretId } from './epochSecret'
import { EncryptedData } from '@river-build/proto'
import { IEpochSecretStore } from './epochSecretStore'

const MLS_ALGORITHM = 'mls_0.0.1'

export class EpochSecretService {
    private epochSecretStore: IEpochSecretStore
    private cipherSuite: MlsCipherSuite
    private cache: Map<EpochSecretId, EpochSecret> = new Map()
    log: DLogger

    public constructor(
        cipherSuite: MlsCipherSuite,
        epochSecretStore: IEpochSecretStore,
        log: DLogger,
    ) {
        this.log = log
        this.cipherSuite = cipherSuite
        this.epochSecretStore = epochSecretStore
    }

    /// Gets epochKey from the cache
    public getEpochSecret(streamId: string, epoch: bigint): EpochSecret | undefined {
        const epochId: EpochSecretId = epochSecretId(streamId, epoch)
        return this.cache.get(epochId)
    }

    /// Loads epoch secret from storage and rehydrates the cache
    public async loadEpochSecret(
        streamId: string,
        epoch: bigint,
    ): Promise<EpochSecret | undefined> {
        const epochKey = await this.epochSecretStore.getEpochSecret(streamId, epoch)
        const epochId = epochSecretId(streamId, epoch)
        if (epochKey) {
            this.cache.set(epochId, epochKey)
        } else {
            this.cache.delete(epochId)
        }
        return epochKey
    }

    private async saveEpochSecret(epochSecret: EpochSecret): Promise<void> {
        this.log('saveEpochSecret', {
            streamId: epochSecret.streamId,
            epoch: epochSecret.epoch,
        })
        this.cache.set(epochSecretId(epochSecret.streamId, epochSecret.epoch), epochSecret)
        await this.epochSecretStore.setEpochSecret(epochSecret)
    }

    /// Seal epoch secret
    public async sealEpochSecret(
        epochKey: EpochSecret,
        { publicKey }: { publicKey: Uint8Array },
    ): Promise<void> {
        this.log('sealEpochSecret', {
            streamId: epochKey.streamId,
            epoch: epochKey.epoch,
            publicKey: shortenHexString(bin_toHexString(publicKey)),
        })

        if (epochKey.openEpochSecret === undefined) {
            throw new Error(`Epoch secret not open: ${epochKey.streamId} ${epochKey.epoch}`)
        }
        if (epochKey.sealedEpochSecret !== undefined) {
            throw new Error(`Epoch secret already sealed: ${epochKey.streamId} ${epochKey.epoch}`)
        }

        const publicKey_ = HpkePublicKey.fromBytes(publicKey)
        const sealedEpochSecret = (
            await this.cipherSuite.seal(publicKey_, epochKey.openEpochSecret)
        ).toBytes()
        const updatedEpochKey = { ...epochKey, sealedEpochSecret }
        // TODO: Should this method store epochKey?
        await this.saveEpochSecret(updatedEpochKey)
    }

    // TODO: Refactor this one not to perform load
    public async addAnnouncedSealedEpochSecret(
        streamId: string,
        epoch: bigint,
        sealedEpochSecret: Uint8Array,
    ): Promise<void> {
        this.log('addSealedEpochSecret', {
            streamId,
            epoch,
            sealedEpochSecretBytes: shortenHexString(bin_toHexString(sealedEpochSecret)),
        })
        let epochSecret = await this.epochSecretStore.getEpochSecret(streamId, epoch)
        if (!epochSecret) {
            epochSecret = EpochSecret.fromSealedEpochSecret(streamId, epoch, sealedEpochSecret)
        } else {
            epochSecret = { ...epochSecret, sealedEpochSecret, announced: true }
        }
        // TODO: Should this method store epochKey?
        await this.saveEpochSecret(epochSecret)
    }

    // TODO: Should this method persist the epoch secret?
    public async addOpenEpochSecret(
        streamId: string,
        epoch: bigint,
        openEpochSecret: Uint8Array,
    ): Promise<void> {
        this.log('addOpenEpochSecret', {
            streamId,
            epoch,
            openEpochSecret: shortenHexString(bin_toHexString(openEpochSecret)),
        })
        const openEpochSecret_ = MlsSecret.fromBytes(openEpochSecret)
        const derivedKeys_ = await this.cipherSuite.kemDerive(openEpochSecret_)
        const derivedKeys = {
            publicKey: derivedKeys_.publicKey.toBytes(),
            secretKey: derivedKeys_.secretKey.toBytes(),
        }

        let epochSecret = await this.epochSecretStore.getEpochSecret(streamId, epoch)
        if (!epochSecret) {
            epochSecret = EpochSecret.fromOpenEpochSecret(
                streamId,
                epoch,
                openEpochSecret,
                derivedKeys,
            )
        } else {
            epochSecret = { ...epochSecret, openEpochSecret, derivedKeys }
        }
        // TODO: Should this method store epochKey
        await this.saveEpochSecret(epochSecret)
    }

    public async openSealedEpochSecret(
        epochSecret: EpochSecret,
        nextEpochKeys: DerivedKeys,
    ): Promise<void> {
        this.log('openSealedEpochSecret', {
            streamId: epochSecret.streamId,
            epoch: epochSecret.epoch,
        })

        if (epochSecret.openEpochSecret !== undefined) {
            throw new Error(
                `Epoch secret already open: ${epochSecret.streamId} ${epochSecret.epoch}`,
            )
        }

        if (epochSecret.sealedEpochSecret === undefined) {
            throw new Error(`Epoch secret not sealed: ${epochSecret.streamId} ${epochSecret.epoch}`)
        }

        const sealedEpochSecret_ = HpkeCiphertext.fromBytes(epochSecret.sealedEpochSecret)
        const secretKey_ = HpkeSecretKey.fromBytes(nextEpochKeys.secretKey)
        const publicKey_ = HpkePublicKey.fromBytes(nextEpochKeys.publicKey)
        const unsealedBytes = await this.cipherSuite.open(
            sealedEpochSecret_,
            secretKey_,
            publicKey_,
        )
        await this.addOpenEpochSecret(epochSecret.streamId, epochSecret.epoch, unsealedBytes)
    }

    public async encryptMessage(
        epochSecret: EpochSecret,
        message: Uint8Array,
    ): Promise<EncryptedData> {
        this.log('encryptMessage', {
            streamId: epochSecret.streamId,
            epoch: epochSecret.epoch,
        })

        if (epochSecret.derivedKeys === undefined) {
            throw new Error(`Epoch secret not open: ${epochSecret.streamId} ${epochSecret.epoch}`)
        }

        const publicKey_ = HpkePublicKey.fromBytes(epochSecret.derivedKeys.publicKey)
        const ciphertext_ = await this.cipherSuite.seal(publicKey_, message)
        const ciphertext = ciphertext_.toBytes()

        return new EncryptedData({
            algorithm: MLS_ALGORITHM,
            mls: {
                epoch: epochSecret.epoch,
                ciphertext,
            },
        })
    }

    public async decryptMessage(
        epochSecret: EpochSecret,
        message: EncryptedData,
    ): Promise<Uint8Array> {
        this.log('decryptMessage', {
            streamId: epochSecret.streamId,
            epoch: epochSecret.epoch,
        })

        if (epochSecret.derivedKeys === undefined) {
            throw new Error(`Epoch secret not open: ${epochSecret.streamId} ${epochSecret.epoch}`)
        }

        if (message.algorithm !== MLS_ALGORITHM) {
            throw new Error(`Invalid algorithm: ${message.algorithm}`)
        }

        if (message.mls === undefined) {
            throw new Error('Missing mls payload')
        }

        if (message.mls.epoch !== epochSecret.epoch) {
            throw new Error(`Epoch mismatch: ${message.mls.epoch} != ${epochSecret.epoch}`)
        }

        const ciphertext = message.mls.ciphertext
        const publicKey_ = HpkePublicKey.fromBytes(epochSecret.derivedKeys.publicKey)
        const secretKey_ = HpkeSecretKey.fromBytes(epochSecret.derivedKeys.secretKey)
        const ciphertext_ = HpkeCiphertext.fromBytes(ciphertext)
        return await this.cipherSuite.open(ciphertext_, secretKey_, publicKey_)
    }
}
