import { ZionClient } from '../../../client/ZionClient'
import { TypedEventEmitter } from 'matrix-js-sdk/lib/models/typed-event-emitter'
import { IOnboardingState, ObState_Error } from './IOnboardingState'
import { MatrixClient, User as MatrixUser } from 'matrix-js-sdk'
import { ZionOnboardingOpts } from '../../../client/ZionClientTypes'

export enum OnboardingStepEvent {
    StateUpdate = 'state-update',
    Error = 'error',
}

export type OnboardingStepEventHandlerMap = {
    [OnboardingStepEvent.StateUpdate]: (newState: IOnboardingState, isComplete: boolean) => void
    [OnboardingStepEvent.Error]: (error: ObState_Error) => void
}

export abstract class IOnboardingStep<T = IOnboardingState> extends TypedEventEmitter<
    OnboardingStepEvent,
    OnboardingStepEventHandlerMap
> {
    client: ZionClient
    matrixClient: MatrixClient
    matrixUserId: string

    constructor(client: ZionClient, matrixClient: MatrixClient, matrixUserId: string) {
        super()
        this.client = client
        this.matrixClient = matrixClient
        this.matrixUserId = matrixUserId
    }
    get opts(): ZionOnboardingOpts | undefined {
        return this.client.opts.onboardingOpts
    }
    get matrixUser(): MatrixUser | undefined {
        const user = this.matrixClient.getUser(this.matrixUserId)
        return user ?? undefined
    }
    abstract get state(): T
    abstract shouldExecute(): boolean
    abstract start(): void
    abstract stop(): void
}
