import { ExternalGroup as MlsExternalGroup } from '@river-build/mls-rs-wasm'

export class ExternalGroup {
    public readonly streamId: string
    public readonly externalGroup: MlsExternalGroup

    constructor(streamId: string, externalGroup: MlsExternalGroup) {
        this.streamId = streamId
        this.externalGroup = externalGroup
    }
}
