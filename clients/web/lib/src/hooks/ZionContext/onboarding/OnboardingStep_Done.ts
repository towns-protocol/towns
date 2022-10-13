/* eslint-disable @typescript-eslint/no-empty-function */
import { ObState_Done } from './IOnboardingState'
import { IOnboardingStep } from './IOnboardingStep'

/***
 * Done
 * never finishes, just hangs out in the done state
 */
export class OnboardingStep_Done extends IOnboardingStep<ObState_Done> {
    get state(): ObState_Done {
        return {
            kind: 'done',
        }
    }

    shouldExecute(): boolean {
        return true
    }

    start() {}

    stop() {}
}
