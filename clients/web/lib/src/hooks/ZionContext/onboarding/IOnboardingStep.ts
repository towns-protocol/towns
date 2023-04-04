import { ZionClient } from '../../../client/ZionClient'
import { TypedEventEmitter } from 'matrix-js-sdk/lib/models/typed-event-emitter'
import { IOnboardingState, ObState_Error } from './IOnboardingState'
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

    constructor(client: ZionClient) {
        super()
        this.client = client
    }
    get opts(): ZionOnboardingOpts | undefined {
        return this.client.opts.onboardingOpts
    }
    abstract get state(): T
    abstract shouldExecute(): boolean
    abstract start(): void
    abstract stop(): void
}
