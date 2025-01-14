import { ExternalGroup } from './externalGroup'
import { ExternalCrypto } from './externalCrypto'
import { dlog, DLogger } from '@river-build/dlog'

const defaultLogger = dlog('csb:mls:externalGroupService')

export class ExternalGroupService {
    private log: {
        debug: DLogger
        error: DLogger
    }

    private crypto: ExternalCrypto

    constructor(crypto: ExternalCrypto, opts?: { log: DLogger }) {
        this.crypto = crypto
        const logger = opts?.log ?? defaultLogger
        this.log = {
            debug: logger.extend('debug'),
            error: logger.extend('error'),
        }
    }

    public exportTree(group: ExternalGroup): Uint8Array {
        return this.crypto.exportTree(group)
    }

    public async loadSnapshot(streamId: string, snapshot: Uint8Array): Promise<ExternalGroup> {
        return this.crypto.loadExternalGroupFromSnapshot(streamId, snapshot)
    }

    public async processCommit(externalGroup: ExternalGroup, commit: Uint8Array): Promise<void> {
        return this.crypto.processCommit(externalGroup, commit)
    }
}
