import {
    Client as MlsClient,
    ExportedTree as MlsExportedTree,
    Group as MlsGroup,
    MlsMessage,
} from '@river-build/mls-rs-wasm'
import { dlog, DLogger } from '@river-build/dlog'
import { Group } from './group'

const log = dlog('csb:mls:crypto')

export class Crypto {
    private client!: MlsClient
    public readonly userAddress: Uint8Array
    public readonly deviceKey: Uint8Array
    protected readonly log: {
        info: DLogger
        debug: DLogger
        error: DLogger
    }

    constructor(userAddress: Uint8Array, deviceKey: Uint8Array, opts?: { log: DLogger }) {
        this.userAddress = userAddress
        this.deviceKey = deviceKey
        const log_ = opts?.log ?? log
        this.log = {
            info: log_.extend('info'),
            debug: log_.extend('debug'),
            error: log_.extend('error'),
        }
    }

    public async initialize() {
        const name = new Uint8Array(this.userAddress.length + this.deviceKey.length)
        name.set(this.userAddress, 0)
        name.set(this.deviceKey, this.userAddress.length)
        this.client = await MlsClient.create(name)
    }

    public async createGroup(streamId: string): Promise<Group> {
        if (!this.client) {
            this.log.error('createGroup: Client not initialized')
            throw new Error('Client not initialized')
        }

        // TODO: Create group with a particular group id
        // TODO: Does the Rust API permit returning groupInfo in a single call?
        const mlsGroup = await this.client.createGroup()
        const groupInfoWithExternalKey = (
            await mlsGroup.groupInfoMessageAllowingExtCommit(true)
        ).toBytes()

        return Group.createGroup(streamId, mlsGroup, groupInfoWithExternalKey)
    }

    public async externalJoin(
        streamId: string,
        groupInfo: Uint8Array,
        exportedTree: Uint8Array,
    ): Promise<Group> {
        if (!this.client) {
            this.log.error('externalJoin: Client not initialized')
            throw new Error('Client not initialized')
        }

        // TODO: Does the Rust API permit returning groupInfo in a single call?
        const { group: mlsGroup, commit } = await this.client.commitExternal(
            MlsMessage.fromBytes(groupInfo),
            MlsExportedTree.fromBytes(exportedTree),
        )
        const groupInfoWithExternalKey = (
            await mlsGroup.groupInfoMessageAllowingExtCommit(true)
        ).toBytes()
        const commitBytes = commit.toBytes()

        return Group.externalJoin(streamId, mlsGroup, commitBytes, groupInfoWithExternalKey)
    }

    /// Process current group commit and return epoch
    public async processCommit(group: Group, commit: Uint8Array): Promise<bigint> {
        await group.group.processIncomingMessage(MlsMessage.fromBytes(commit))
        return group.group.currentEpoch
    }

    // TODO: Make this return undefined in case of an error?
    public async loadGroup(groupId: Uint8Array): Promise<MlsGroup> {
        if (!this.client) {
            this.log.error('loadGroup: Client not initialized')
            throw new Error('Client not initialized')
        }

        return this.client.loadGroup(groupId)
    }

    public async writeGroupToStorage(group: MlsGroup): Promise<void> {
        await group.writeToStorage()
    }

    public currentEpoch(group: Group): bigint {
        return group.group.currentEpoch
    }

    public signaturePublicKey(): Uint8Array {
        if (!this.client) {
            this.log.error('signaturePublicKey: Client not initialized')
            throw new Error('Client not initialized')
        }
        return this.client.signaturePublicKey()
    }
}
