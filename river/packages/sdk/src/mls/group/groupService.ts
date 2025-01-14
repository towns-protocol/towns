import { IGroupStore } from './groupStore'
import { Group } from './group'
import {
    MemberPayload_Mls_ExternalJoin,
    MemberPayload_Mls_InitializeGroup,
} from '@river-build/proto'
import { PlainMessage } from '@bufbuild/protobuf'
import { Crypto } from './crypto'
import { DLogger, dlog, bin_equal } from '@river-build/dlog'

type InitializeGroupMessage = PlainMessage<MemberPayload_Mls_InitializeGroup>
type ExternalJoinMessage = PlainMessage<MemberPayload_Mls_ExternalJoin>

// Placeholder for a coordinator
export interface IGroupServiceCoordinator {
    joinOrCreateGroup(streamId: string): void
    groupActive(streamId: string): void
    newEpoch(streamId: string, epoch: bigint): void
}

const defaultLogger = dlog('csb:mls:groupService')

/// Service handling group operations both for Group and External Group
export class GroupService {
    private groupCache: Map<string, Group> = new Map()
    private groupStore: IGroupStore
    private log: {
        debug: DLogger
        error: DLogger
    }

    private crypto: Crypto
    private coordinator: IGroupServiceCoordinator | undefined

    constructor(
        groupStore: IGroupStore,
        crypto: Crypto,
        coordinator?: IGroupServiceCoordinator,
        opts?: { log: DLogger },
    ) {
        this.groupStore = groupStore
        this.crypto = crypto
        this.coordinator = coordinator

        const logger = opts?.log ?? defaultLogger

        this.log = {
            debug: logger.extend('debug'),
            error: logger.extend('error'),
        }
    }

    public getGroup(streamId: string): Group | undefined {
        this.log.debug('getGroup', { streamId })
        return this.groupCache.get(streamId)
    }

    public async loadGroup(streamId: string): Promise<void> {
        this.log.debug('loadGroup', { streamId })
        const dto = await this.groupStore.getGroup(streamId)

        if (dto === undefined) {
            return
        }

        const { groupId, ...fields } = dto

        // TODO: Add error handling
        const mlsGroup = await this.crypto.loadGroup(groupId)

        const group = {
            ...fields,
            group: mlsGroup,
        }

        this.groupCache.set(streamId, group)
    }

    // TODO: Add recovery in case any of those failing
    public async saveGroup(group: Group): Promise<void> {
        this.log.debug('saveGroup', { streamId: group.streamId })

        this.groupCache.set(group.streamId, group)

        const { group: mlsGroup, ...fields } = group
        const groupId = mlsGroup.groupId
        const dto = { ...fields, groupId }

        await this.groupStore.setGroup(dto)
        await this.crypto.writeGroupToStorage(group.group)
    }

    // TODO: Should this be private or public?
    public async clearGroup(streamId: string): Promise<void> {
        this.log.debug('clearGroup', { streamId })

        this.groupCache.delete(streamId)
        await this.groupStore.clearGroup(streamId)
        // TODO: Clear group in GroupStateStore
    }

    // TODO: Should this throw an Error?
    public async handleInitializeGroup(group: Group, _message: InitializeGroupMessage) {
        this.log.debug('handleInitializeGroup', { streamId: group.streamId })

        const isGroupActive = group.status === 'GROUP_ACTIVE'
        if (isGroupActive) {
            this.log.error('handleInitializeGroup: Group is already active', {
                streamId: group.streamId,
            })
            // Report programmer error
            throw new Error('Programmer error: Group is already active')
        }

        const wasInitializeGroupOurOwn =
            group.status === 'GROUP_PENDING_CREATE' &&
            group.groupInfoWithExternalKey !== undefined &&
            bin_equal(_message.groupInfoMessage, group.groupInfoWithExternalKey) &&
            bin_equal(_message.signaturePublicKey, this.getSignaturePublicKey())

        if (!wasInitializeGroupOurOwn) {
            await this.clearGroup(group.streamId)
            this.coordinator?.joinOrCreateGroup(group.streamId)
            return
        }

        const activeGroup = Group.activeGroup(group.streamId, group.group)
        await this.saveGroup(activeGroup)

        this.coordinator?.groupActive(group.streamId)
        const epoch = this.crypto.currentEpoch(group)
        this.coordinator?.newEpoch(group.streamId, epoch)
    }

    public async handleExternalJoin(group: Group, message: ExternalJoinMessage) {
        this.log.debug('handleExternalJoin', { streamId: group.streamId })

        const isGroupActive = group.status === 'GROUP_ACTIVE'
        if (isGroupActive) {
            await this.crypto.processCommit(group, message.commit)
            await this.saveGroup(group)
            const epoch = this.crypto.currentEpoch(group)
            this.coordinator?.newEpoch(group.streamId, epoch)
            return
        }

        const wasExternalJoinOurOwn =
            group.status === 'GROUP_PENDING_JOIN' &&
            group.groupInfoWithExternalKey !== undefined &&
            bin_equal(message.groupInfoMessage, group.groupInfoWithExternalKey) &&
            group.commit !== undefined &&
            bin_equal(message.commit, group.commit) &&
            bin_equal(message.signaturePublicKey, this.getSignaturePublicKey())

        if (!wasExternalJoinOurOwn) {
            await this.clearGroup(group.streamId)
            this.coordinator?.joinOrCreateGroup(group.streamId)
            return
        }

        const activeGroup = Group.activeGroup(group.streamId, group.group)
        await this.saveGroup(activeGroup)

        this.coordinator?.groupActive(group.streamId)
        const epoch = this.crypto.currentEpoch(group)
        this.coordinator?.newEpoch(group.streamId, epoch)
    }

    public async initializeGroupMessage(streamId: string): Promise<InitializeGroupMessage> {
        this.log.debug('initializeGroupMessage', { streamId })

        if (this.groupCache.has(streamId)) {
            this.log.error(`initializeGroupMessage: Group already exists for ${streamId}`)
            throw new Error(`Group already exists for ${streamId}`)
        }

        const group = await this.crypto.createGroup(streamId)
        await this.saveGroup(group)

        const externalGroupSnapshot = this.exportGroupSnapshot(group)

        const signaturePublicKey = this.getSignaturePublicKey()

        return {
            groupInfoMessage: group.groupInfoWithExternalKey!,
            signaturePublicKey,
            externalGroupSnapshot,
        }
    }

    public async externalJoinMessage(
        streamId: string,
        latestGroupInfo: Uint8Array,
        exportedTree: Uint8Array,
    ): Promise<ExternalJoinMessage> {
        this.log.debug('externalJoinMessage', { streamId })

        if (this.groupCache.has(streamId)) {
            this.log.error(`externalJoinMessage: Group already exists for ${streamId}`)
            throw new Error(`Group already exists for ${streamId}`)
        }

        const group = await this.crypto.externalJoin(streamId, latestGroupInfo, exportedTree)
        await this.saveGroup(group)

        const signaturePublicKey = this.getSignaturePublicKey()

        return {
            commit: group.commit!,
            groupInfoMessage: group.groupInfoWithExternalKey!,
            signaturePublicKey,
        }
    }

    public exportGroupSnapshot(_group: Group): Uint8Array {
        throw new Error('Not implemented')
    }

    public currentEpoch(group: Group): bigint {
        return this.crypto.currentEpoch(group)
    }

    private getSignaturePublicKey(): Uint8Array {
        return this.crypto.signaturePublicKey()
    }

    public async exportEpochSecret(group: Group): Promise<Uint8Array> {
        return this.crypto.exportEpochSecret(group)
    }
}
