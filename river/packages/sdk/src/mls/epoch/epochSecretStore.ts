import { EpochSecret, epochSecretId, EpochSecretId } from './epochSecret'
import { DLogger } from '@river-build/dlog'

export interface IEpochSecretStore {
    getEpochSecret(streamId: string, epoch: bigint): Promise<EpochSecret | undefined>

    setEpochSecret(epochSecret: EpochSecret): Promise<void>
}

export class InMemoryEpochSecretStore implements IEpochSecretStore {
    private epochKeySates: Map<EpochSecretId, EpochSecret> = new Map()
    log: DLogger

    constructor(log: DLogger) {
        this.log = log
    }

    public async getEpochSecret(streamId: string, epoch: bigint): Promise<EpochSecret | undefined> {
        const epochId: EpochSecretId = epochSecretId(streamId, epoch)
        return this.epochKeySates.get(epochId)
    }

    public async setEpochSecret(epochSecret: EpochSecret): Promise<void> {
        const epochId = epochSecretId(epochSecret.streamId, epochSecret.epoch)
        this.epochKeySates.set(epochId, epochSecret)
    }
}
