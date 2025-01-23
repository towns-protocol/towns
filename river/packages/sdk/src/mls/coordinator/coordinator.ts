import { Message, PlainMessage } from '@bufbuild/protobuf'
import {
    EncryptedData,
    MemberPayload_Mls_EpochSecrets,
    MemberPayload_Mls_ExternalJoin,
    MemberPayload_Mls_InitializeGroup,
    StreamEvent,
} from '@river-build/proto'
import { GroupService, InMemoryGroupStore, Crypto } from '../group'
import { EpochSecret, EpochSecretService, InMemoryEpochSecretStore } from '../epoch'
import { ExternalCrypto, ExternalGroupService } from '../externalGroup'
import { check, dlog, DLogger } from '@river-build/dlog'
import { isDefined } from '../../check'
import { EncryptedContentItem } from '@river-build/encryption'
import {
    EncryptedContent,
    isEncryptedContentKind,
    toDecryptedContent,
} from '../../encryptedContentTypes'
import { Client } from '../../client'
import { IPersistenceStore } from '../../persistenceStore'
import { IAwaiter, IndefiniteAwaiter } from './awaiter'
import {
    IQueueService,
    QueueService,
    EpochSecretServiceCoordinatorAdapter,
    GroupServiceCoordinatorAdapter,
} from '../queue'
import { addressFromUserId } from '../../id'
import { make_MemberPayload_Mls } from '../../types'

type InitializeGroupMessage = PlainMessage<MemberPayload_Mls_InitializeGroup>
type ExternalJoinMessage = PlainMessage<MemberPayload_Mls_ExternalJoin>
type EpochSecretsMessage = PlainMessage<MemberPayload_Mls_EpochSecrets>

type MlsEncryptedContentItem = {
    streamId: string
    eventId: string
    kind: string
    encryptedData: EncryptedData
}

export interface ICoordinator {
    // Commands
    joinOrCreateGroup(streamId: string): Promise<void>
    groupActive(streamId: string): void
    newOpenEpochSecret(streamId: string, epoch: bigint): Promise<void>
    newSealedEpochSecret(streamId: string, epoch: bigint): Promise<void>
    announceEpochSecret(streamId: string, epoch: bigint): Promise<void>
    // Events
    handleInitializeGroup(streamId: string, message: InitializeGroupMessage): Promise<void>
    handleExternalJoin(streamId: string, message: ExternalJoinMessage): Promise<void>
    handleEpochSecrets(streamId: string, message: EpochSecretsMessage): Promise<void>
    handleEncryptedContent(
        streamId: string,
        eventId: string,
        message: EncryptedContent,
    ): Promise<void>
}

const defaultLogger = dlog('csb:mls:coordinator')

export class Coordinator implements ICoordinator {
    private userId: string
    private readonly userAddress: Uint8Array
    private readonly deviceKey: Uint8Array
    private epochSecretService: EpochSecretService
    private groupService: GroupService
    private externalGroupService: ExternalGroupService
    private decryptionFailures: Map<string, Map<bigint, MlsEncryptedContentItem[]>> = new Map()
    private client!: Client
    private persistenceStore!: IPersistenceStore
    private awaitingGroupActive: Map<string, IAwaiter> = new Map()
    private readonly queueService: IQueueService

    private log: {
        error: DLogger
        debug: DLogger
    }

    constructor(
        userId: string,
        deviceKey: Uint8Array,
        client: Client,
        persistenceStore: IPersistenceStore,
        opts?: { log: DLogger },
    ) {
        this.client = client
        this.persistenceStore = persistenceStore
        const logger = opts?.log ?? defaultLogger
        this.log = {
            debug: logger.extend('debug'),
            error: logger.extend('error'),
        }

        this.userId = userId
        this.userAddress = addressFromUserId(userId)
        this.deviceKey = deviceKey

        // Composing all the dependencies
        this.queueService = new QueueService(this)
        this.externalGroupService = new ExternalGroupService(new ExternalCrypto(), opts)
        const groupStore = new InMemoryGroupStore()
        const crypto = new Crypto(this.userAddress, this.deviceKey, opts)
        const groupServiceCoordinator = new GroupServiceCoordinatorAdapter(this.queueService)

        this.groupService = new GroupService(groupStore, crypto, groupServiceCoordinator, opts)
        const epochSecretStore = new InMemoryEpochSecretStore()
        const epochSecretServiceCoordinator = new EpochSecretServiceCoordinatorAdapter(
            this.queueService,
        )
        this.epochSecretService = new EpochSecretService(
            crypto.ciphersuite(),
            epochSecretStore,
            epochSecretServiceCoordinator,
            opts,
        )
    }

    // API needed by the client
    // TODO: How long will be the timeout here?
    public async encryptGroupEventEpochSecret(
        streamId: string,
        event: Message,
    ): Promise<EncryptedData> {
        const hasGroup = this.groupService.getGroup(streamId) !== undefined
        if (!hasGroup) {
            // No group so we request joining
            // NOTE: We are enqueueing command instead of doing the async call
            this.queueService?.enqueueCommand({ tag: 'joinOrCreateGroup', streamId })
        }
        // Wait for the group to become active
        await this.awaitGroupActive(streamId)
        const activeGroup = this.groupService.getGroup(streamId)
        if (activeGroup === undefined) {
            throw new Error('Fatal: no group after awaitGroupActive')
        }

        if (activeGroup.status !== 'GROUP_ACTIVE') {
            throw new Error('Fatal: group is not active')
        }

        const epoch = this.groupService.currentEpoch(activeGroup)

        let epochSecret = this.epochSecretService.getEpochSecret(streamId, epoch)

        if (epochSecret === undefined) {
            // NOTE: queue has not processed new epoch event yet, force it manually
            await this.newEpoch(streamId, epoch)
            epochSecret = this.epochSecretService.getEpochSecret(streamId, epoch)
            if (epochSecret === undefined) {
                throw new Error('Fatal: epoch secret not found')
            }
        }

        const plainbytes = event.toBinary()

        return this.epochSecretService.encryptMessage(epochSecret, plainbytes)
    }

    // TODO: Maybe this could be refactored into a separate class
    private async decryptGroupEvent(
        epochSecret: EpochSecret,
        streamId: string,
        eventId: string,
        kind: string, // kind of data
        encryptedData: EncryptedData,
    ) {
        // this.logCall('decryptGroupEvent', streamId, eventId, kind,
        // encryptedData)
        const stream = this.client.stream(streamId)
        check(isDefined(stream), 'stream not found')
        check(isEncryptedContentKind(kind), `invalid kind ${kind}`)

        // check cache
        let cleartext = await this.persistenceStore.getCleartext(eventId)
        if (cleartext === undefined) {
            cleartext = await this.epochSecretService.decryptMessage(epochSecret, encryptedData)
        }
        const decryptedContent = toDecryptedContent(kind, encryptedData.version, cleartext)

        stream.updateDecryptedContent(eventId, decryptedContent)
    }

    // # MLS Coordinator #

    public async handleInitializeGroup(streamId: string, message: InitializeGroupMessage) {
        const group = this.groupService.getGroup(streamId)
        if (group !== undefined) {
            await this.groupService.handleInitializeGroup(group, message)
        }
    }

    public async handleExternalJoin(streamId: string, message: ExternalJoinMessage) {
        const group = this.groupService.getGroup(streamId)
        if (group !== undefined) {
            await this.groupService.handleExternalJoin(group, message)
        }
    }

    public async handleEpochSecrets(streamId: string, message: EpochSecretsMessage) {
        return this.epochSecretService.handleEpochSecrets(streamId, message)
    }

    public async handleEncryptedContent(
        streamId: string,
        eventId: string,
        message: EncryptedContent,
    ) {
        const encryptedData = message.content
        // TODO: Check if message was encrypted with MLS
        // const ciphertext = encryptedData.mls!.ciphertext
        const epoch = encryptedData.mls!.epoch
        const kind = message.kind

        const epochSecret = this.epochSecretService.getEpochSecret(streamId, epoch)
        if (epochSecret === undefined) {
            this.log.debug('Epoch secret not found', { streamId, epoch })
            this.enqueueDecryptionFailure(streamId, epoch, {
                streamId,
                eventId,
                kind,
                encryptedData,
            })
            return
        }

        // Decrypt immediately
        return this.decryptGroupEvent(epochSecret, streamId, eventId, kind, encryptedData)
    }

    private enqueueDecryptionFailure(streamId: string, epoch: bigint, item: EncryptedContentItem) {
        let perStream = this.decryptionFailures.get(streamId)
        if (perStream === undefined) {
            perStream = new Map()
            this.decryptionFailures.set(item.streamId, perStream)
        }
        let perEpoch = perStream.get(epoch)
        if (perEpoch === undefined) {
            perEpoch = []
            perStream.set(epoch, perEpoch)
        }
        perEpoch.push(item)
    }

    private async initializeGroupMessage(streamId: string): Promise<InitializeGroupMessage> {
        // TODO: Check preconditions
        // TODO: Catch the error
        return this.groupService.initializeGroupMessage(streamId)
    }

    private async externalJoinMessage(
        streamId: string,
        externalInfo: {
            externalGroupSnapshot: Uint8Array
            groupInfoMessage: Uint8Array
            commits: { commit: Uint8Array; groupInfoMessage: Uint8Array }[]
        },
    ): Promise<ExternalJoinMessage> {
        const externalGroup = await this.externalGroupService.loadSnapshot(
            streamId,
            externalInfo.externalGroupSnapshot,
        )
        for (const commit of externalInfo.commits) {
            await this.externalGroupService.processCommit(externalGroup, commit.commit)
        }
        const exportedTree = this.externalGroupService.exportTree(externalGroup)
        const latestGroupInfo = externalInfo.groupInfoMessage

        return this.groupService.externalJoinMessage(streamId, latestGroupInfo, exportedTree)
    }

    private async epochSecretsMessage(epochSecret: EpochSecret): Promise<EpochSecretsMessage> {
        // TODO: Check preconditions
        return this.epochSecretService.epochSecretMessage(epochSecret)
    }

    public async joinOrCreateGroup(streamId: string): Promise<void> {
        const hasGroup = this.groupService.getGroup(streamId) !== undefined
        if (hasGroup) {
            return
        }
        const externalInfo = await this.client.getMlsExternalGroupInfo(streamId)

        let joinOrCreateGroupMessage: PlainMessage<StreamEvent>['payload']

        if (externalInfo === undefined) {
            const initializeGroupMessage = await this.initializeGroupMessage(streamId)
            joinOrCreateGroupMessage = make_MemberPayload_Mls({
                content: {
                    case: 'initializeGroup',
                    value: initializeGroupMessage,
                },
            })
        } else {
            const externalJoinMessage = await this.externalJoinMessage(streamId, externalInfo)
            joinOrCreateGroupMessage = make_MemberPayload_Mls({
                content: {
                    case: 'externalJoin',
                    value: externalJoinMessage,
                },
            })
        }

        // Send message to the node
        try {
            await this.client.makeEventAndAddToStream(streamId, joinOrCreateGroupMessage)
        } catch (e) {
            this.log.error('Failed to join or create group', { streamId, error: e })
            if (this.groupService.getGroup(streamId) !== undefined) {
                await this.groupService.clearGroup(streamId)
            }
        }
    }

    // NOTE: Critical section, no awaits permitted
    public awaitGroupActive(streamId: string): Promise<void> {
        // this.log(`awaitGroupActive ${streamId}`)
        if (this.groupService.getGroup(streamId)?.status === 'GROUP_ACTIVE') {
            return Promise.resolve()
        }

        let awaiter = this.awaitingGroupActive.get(streamId)
        if (awaiter === undefined) {
            const internalAwaiter = new IndefiniteAwaiter()
            // NOTE: we clear after the promise has resolved
            const promise = internalAwaiter.promise.finally(() => {
                this.awaitingGroupActive.delete(streamId)
            })
            awaiter = {
                promise,
                resolve: internalAwaiter.resolve,
            }
            this.awaitingGroupActive.set(streamId, awaiter)
        }

        return awaiter.promise
    }

    public groupActive(streamId: string): void {
        const awaiter = this.awaitingGroupActive.get(streamId)
        if (awaiter !== undefined) {
            awaiter.resolve()
        }
    }

    public async newEpoch(streamId: string, epoch: bigint): Promise<void> {
        const epochAlreadyProcessed =
            this.epochSecretService.getEpochSecret(streamId, epoch) !== undefined
        if (epochAlreadyProcessed) {
            return
        }

        const group = this.groupService.getGroup(streamId)
        if (group === undefined) {
            throw new Error('Fatal: newEpoch called for missing group')
        }

        if (group.status !== 'GROUP_ACTIVE') {
            throw new Error('Fatal: newEpoch called for non-active group')
        }

        if (this.groupService.currentEpoch(group) !== epoch) {
            throw new Error('Fatal: newEpoch called for wrong epoch')
        }

        const epochSecret = await this.groupService.exportEpochSecret(group)
        await this.epochSecretService.addOpenEpochSecret(streamId, epoch, epochSecret)
        this.queueService?.enqueueCommand({ tag: 'announceEpochSecret', streamId, epoch })
    }

    public async newOpenEpochSecret(streamId: string, _epoch: bigint): Promise<void> {
        const epochSecret = this.epochSecretService.getEpochSecret(streamId, _epoch)
        if (epochSecret === undefined) {
            throw new Error('Fatal: newEpochSecret called for missing epoch secret')
        }

        if (epochSecret.derivedKeys === undefined) {
            throw new Error('Fatal: missing derived keys for open secret')
        }

        // TODO: Decrypt all messages for that particular epoch secret
        const perStream = this.decryptionFailures.get(streamId)
        if (perStream !== undefined) {
            const perEpoch = perStream.get(_epoch)
            if (perEpoch !== undefined) {
                perStream.delete(_epoch)
                // TODO: Can this be Promise.all?
                for (const decryptionFailure of perEpoch) {
                    await this.decryptGroupEvent(
                        epochSecret,
                        decryptionFailure.streamId,
                        decryptionFailure.eventId,
                        decryptionFailure.kind,
                        decryptionFailure.encryptedData,
                    )
                }
            }
        }

        const previousEpochSecret = this.epochSecretService.getEpochSecret(streamId, _epoch - 1n)
        if (
            previousEpochSecret !== undefined &&
            this.epochSecretService.canBeOpened(previousEpochSecret)
        ) {
            await this.epochSecretService.openSealedEpochSecret(
                previousEpochSecret,
                epochSecret.derivedKeys,
            )
        }
    }

    public async newSealedEpochSecret(streamId: string, epoch: bigint): Promise<void> {
        const epochSecret = this.epochSecretService.getEpochSecret(streamId, epoch)
        if (epochSecret === undefined) {
            throw new Error('Fatal: newSealedEpochSecret called for missing epoch secret')
        }

        if (epochSecret.sealedEpochSecret === undefined) {
            throw new Error('Fatal: missing sealed secret for sealed secret')
        }

        // TODO: Maybe this can be Promise.all?
        await this.tryOpeningSealedEpochSecret(epochSecret)
        await this.tryAnnouncingSealedEpochSecret(epochSecret)
    }

    private async tryOpeningSealedEpochSecret(sealedEpochSecret: EpochSecret): Promise<void> {
        if (sealedEpochSecret.sealedEpochSecret === undefined) {
            throw new Error('Fatal: tryOpeningSealedEpochSecret called for missing sealed secret')
        }

        // Already open
        if (sealedEpochSecret.openEpochSecret !== undefined) {
            return
        }

        // Missing derived keys needed to open
        const nextEpochSecret = this.epochSecretService.getEpochSecret(
            sealedEpochSecret.streamId,
            sealedEpochSecret.epoch + 1n,
        )
        if (nextEpochSecret?.derivedKeys === undefined) {
            return
        }

        return this.epochSecretService.openSealedEpochSecret(
            sealedEpochSecret,
            nextEpochSecret.derivedKeys,
        )
    }

    public async announceEpochSecret(_streamId: string, _epoch: bigint) {
        let epochSecret = this.epochSecretService.getEpochSecret(_streamId, _epoch)
        if (epochSecret === undefined) {
            throw new Error('Fatal: announceEpochSecret called for missing epoch secret')
        }

        if (epochSecret.sealedEpochSecret === undefined) {
            const nextEpochKey = this.epochSecretService.getEpochSecret(
                epochSecret.streamId,
                epochSecret.epoch + 1n,
            )
            if (nextEpochKey?.derivedKeys !== undefined) {
                await this.epochSecretService.sealEpochSecret(epochSecret, nextEpochKey.derivedKeys)
                epochSecret = this.epochSecretService.getEpochSecret(
                    epochSecret.streamId,
                    epochSecret.epoch,
                )
                if (epochSecret === undefined) {
                    throw new Error('Fatal: epoch secret not found after sealing')
                }
            }
        }

        return this.tryAnnouncingSealedEpochSecret(epochSecret)
    }

    private async tryAnnouncingSealedEpochSecret(epochSecret: EpochSecret): Promise<void> {
        const streamId = epochSecret.streamId
        const epoch = epochSecret.epoch

        if (epochSecret.sealedEpochSecret === undefined) {
            throw new Error('Fatal: announceSealedEpoch called for missing sealed secret')
        }

        if (epochSecret.announced) {
            return
        }

        const epochSecretsMessage = await this.epochSecretsMessage(epochSecret)

        try {
            await this.client.makeEventAndAddToStream(
                streamId,
                make_MemberPayload_Mls({
                    content: {
                        case: 'epochSecrets',
                        value: epochSecretsMessage,
                    },
                }),
            )
        } catch (e) {
            this.log.error('Failed to announce epoch secret', { streamId, epoch, error: e })
            this.queueService.enqueueCommand({ tag: 'announceEpochSecret', streamId, epoch })
        }
    }
}
