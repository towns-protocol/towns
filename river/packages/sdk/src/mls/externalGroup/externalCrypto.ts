import { ExternalGroup } from './externalGroup'
import {
    MlsMessage,
    ExternalSnapshot as MlsExternalSnapshot,
    ExternalClient as MlsExternalClient,
} from '@river-build/mls-rs-wasm'

export class ExternalCrypto {
    public async processCommit(group: ExternalGroup, commit: Uint8Array) {
        await group.externalGroup.processIncomingMessage(MlsMessage.fromBytes(commit))
    }

    public async loadExternalGroupFromSnapshot(
        streamId: string,
        snapshot: Uint8Array,
    ): Promise<ExternalGroup> {
        const externalClient = new MlsExternalClient()
        const externalSnapshot = MlsExternalSnapshot.fromBytes(snapshot)
        const externalGroup = await externalClient.loadGroup(externalSnapshot)
        return new ExternalGroup(streamId, externalGroup)
    }

    public exportTree(group: ExternalGroup): Uint8Array {
        return group.externalGroup.exportTree()
    }
}
