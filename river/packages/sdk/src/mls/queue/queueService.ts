import { PlainMessage } from '@bufbuild/protobuf'
import {
    MemberPayload_Mls_EpochSecrets,
    MemberPayload_Mls_ExternalJoin,
    MemberPayload_Mls_InitializeGroup,
} from '@river-build/proto'
import { IGroupServiceCoordinator } from '../group'
import { IEpochSecretServiceCoordinator } from '../epoch'
import { DLogger } from '@river-build/dlog'
import { logNever } from '../../check'
import { EncryptedContent } from '../../encryptedContentTypes'
import { ICoordinator } from '../coordinator'

type InitializeGroupMessage = PlainMessage<MemberPayload_Mls_InitializeGroup>
type ExternalJoinMessage = PlainMessage<MemberPayload_Mls_ExternalJoin>
type EpochSecretsMessage = PlainMessage<MemberPayload_Mls_EpochSecrets>

// Commands, which are internal commands of the Queue

type JoinOrCreateGroupCommand = {
    tag: 'joinOrCreateGroup'
    streamId: string
}

type GroupActiveCommand = {
    tag: 'groupActive'
    streamId: string
}

type NewEpochCommand = {
    tag: 'newEpoch'
    streamId: string
    epoch: bigint
}

type NewOpenEpochSecretCommand = {
    tag: 'newOpenEpochSecret'
    streamId: string
    epoch: bigint
}

type NewSealedEpochSecretCommand = {
    tag: 'newSealedEpochSecret'
    streamId: string
    epoch: bigint
}

type AnnounceEpochSecretCommand = {
    tag: 'announceEpochSecret'
    streamId: string
    epoch: bigint
}

type QueueCommand =
    | JoinOrCreateGroupCommand
    | GroupActiveCommand
    | NewEpochCommand
    | NewOpenEpochSecretCommand
    | NewSealedEpochSecretCommand
    | AnnounceEpochSecretCommand

// Events, which we are processing from outside
type InitializeGroupEvent = {
    tag: 'initializeGroup'
    streamId: string
    message: InitializeGroupMessage
}

type ExternalJoinEvent = {
    tag: 'externalJoin'
    streamId: string
    message: ExternalJoinMessage
}

type EpochSecretsEvent = {
    tag: 'epochSecrets'
    streamId: string
    message: EpochSecretsMessage
}

// TODO: Should encrypted content get its own queue?
type EncryptedContentEvent = {
    tag: 'encryptedContent'
    streamId: string
    eventId: string
    message: EncryptedContent
}

type QueueEvent =
    | InitializeGroupEvent
    | ExternalJoinEvent
    | EpochSecretsEvent
    | EncryptedContentEvent

export interface IQueueService {
    // These are only needed by the Coordinator
    enqueueCommand(command: QueueCommand): void
    enqueueEvent(event: QueueEvent): void
    // These are only needed by the adapter
    start(): void
    stop(): Promise<void>
    onMobileSafariPageVisibilityChanged(this: void): void
}

// This feels more like a coordinator
export class QueueService implements IQueueService {
    private coordinator: ICoordinator

    private log!: {
        error: DLogger
        debug: DLogger
    }

    constructor(coordinator: ICoordinator) {
        this.coordinator = coordinator
        // nop
    }

    // # Queue-related operations #

    // Queue-related fields
    private commandQueue: QueueCommand[] = []
    private eventQueue: QueueEvent[] = []
    private delayMs = 15
    private started: boolean = false
    private stopping: boolean = false
    private timeoutId?: NodeJS.Timeout
    private inProgressTick?: Promise<void>
    private isMobileSafariBackgrounded = false

    public enqueueCommand(command: QueueCommand) {
        this.commandQueue.push(command)
        // TODO: Is this needed when we tick after start
        this.checkStartTicking()
    }

    private dequeueCommand(): QueueCommand | undefined {
        return this.commandQueue.shift()
    }

    public enqueueEvent(event: QueueEvent) {
        this.eventQueue.push(event)
        // TODO: Is this needed when we tick after start
        this.checkStartTicking()
    }

    private dequeueEvent(): QueueEvent | undefined {
        return this.eventQueue.shift()
    }

    getDelayMs(): number {
        return this.delayMs
    }

    public start() {
        // nop
        this.started = true
        this.checkStartTicking()
    }

    public async stop(): Promise<void> {
        this.started = false
        await this.stopTicking()
        // nop
    }

    private shouldPauseTicking(): boolean {
        return this.isMobileSafariBackgrounded
    }

    private checkStartTicking() {
        if (this.stopping) {
            // this.log.debug('ticking is being stopped')
            return
        }

        if (!this.started || this.timeoutId) {
            // this.log.debug('previous tick is still running')
            return
        }

        if (this.shouldPauseTicking()) {
            return
        }

        // TODO: should this have any timeout?
        this.timeoutId = setTimeout(() => {
            this.inProgressTick = this.tick()
                .catch((e) => this.log.error('MLS ProcessTick Error', e))
                .finally(() => {
                    this.timeoutId = undefined
                    this.checkStartTicking()
                })
        }, this.getDelayMs())
    }

    private async stopTicking() {
        if (this.stopping) {
            return
        }
        this.stopping = true

        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
            this.timeoutId = undefined
        }
        if (this.inProgressTick) {
            try {
                await this.inProgressTick
            } catch (e) {
                this.log.error('ProcessTick Error while stopping', e)
            } finally {
                this.inProgressTick = undefined
            }
        }
        this.stopping = false
    }

    public async tick() {
        // noop
        const command = this.dequeueCommand()
        if (command !== undefined) {
            return this.processCommand(command)
        }

        const event = this.dequeueEvent()
        if (event !== undefined) {
            return this.processEvent(event)
        }
    }

    public async processCommand(command: QueueCommand): Promise<void> {
        switch (command.tag) {
            case 'joinOrCreateGroup':
                return this.coordinator.joinOrCreateGroup(command.streamId)
            case 'groupActive':
                return this.coordinator.groupActive(command.streamId)
            case 'newEpoch':
                return this.coordinator.newOpenEpochSecret(command.streamId, command.epoch)
            case 'newOpenEpochSecret':
                return this.coordinator.newOpenEpochSecret(command.streamId, command.epoch)
            case 'newSealedEpochSecret':
                return this.coordinator.newSealedEpochSecret(command.streamId, command.epoch)
            case 'announceEpochSecret':
                return this.coordinator.announceEpochSecret(command.streamId, command.epoch)
            default:
                logNever(command)
        }
    }

    public async processEvent(event: QueueEvent): Promise<void> {
        switch (event.tag) {
            case 'initializeGroup':
                return this.coordinator.handleInitializeGroup(event.streamId, event.message)
            case 'externalJoin':
                return this.coordinator.handleExternalJoin(event.streamId, event.message)
            case 'epochSecrets':
                return this.coordinator.handleEpochSecrets(event.streamId, event.message)
            case 'encryptedContent':
                return this.coordinator.handleEncryptedContent(
                    event.streamId,
                    event.eventId,
                    event.message,
                )
            default:
                logNever(event)
        }
    }

    public readonly onMobileSafariPageVisibilityChanged = () => {
        this.log.debug('onMobileSafariBackgrounded', this.isMobileSafariBackgrounded)
        this.isMobileSafariBackgrounded = document.visibilityState === 'hidden'
        if (!this.isMobileSafariBackgrounded) {
            this.checkStartTicking()
        }
    }
}

export class GroupServiceCoordinatorAdapter implements IGroupServiceCoordinator {
    public readonly queueService: IQueueService

    constructor(queueService: IQueueService) {
        this.queueService = queueService
    }

    public joinOrCreateGroup(streamId: string): void {
        this.queueService.enqueueCommand({ tag: 'joinOrCreateGroup', streamId })
    }
    public groupActive(streamId: string): void {
        this.queueService.enqueueCommand({ tag: 'groupActive', streamId })
    }
    public newEpoch(streamId: string, epoch: bigint): void {
        this.queueService.enqueueCommand({ tag: 'newEpoch', streamId, epoch })
    }
}

export class EpochSecretServiceCoordinatorAdapter implements IEpochSecretServiceCoordinator {
    public readonly queueService: IQueueService

    constructor(queueService: IQueueService) {
        this.queueService = queueService
    }

    public newOpenEpochSecret(streamId: string, epoch: bigint): void {
        this.queueService.enqueueCommand({ tag: 'newOpenEpochSecret', streamId, epoch })
    }
    public newSealedEpochSecret(streamId: string, epoch: bigint): void {
        this.queueService.enqueueCommand({ tag: 'newSealedEpochSecret', streamId, epoch })
    }
}
