import { ObState_Loading } from './IOnboardingState'
import { IOnboardingStep, OnboardingStepEvent } from './IOnboardingStep'

/***
 * Load profile
 * Always runs, necessary for rest of calculations
 * On start, fetch the profile, on complete, update local state to complete
 * and emit a new state
 * On error, emit an error state
 */
export class OnboardingStep_LoadProfile extends IOnboardingStep<ObState_Loading> {
    get state(): ObState_Loading {
        return {
            kind: 'loading',
            message: 'Loading Profile...',
        }
    }

    shouldExecute(): boolean {
        return true
    }

    start() {
        this.client
            .getProfileInfo(this.userId)
            .then(() => {
                this.emit(OnboardingStepEvent.StateUpdate, this.state, true)
            })
            .catch((error) => {
                this.emit(OnboardingStepEvent.Error, {
                    kind: 'error',
                    message: 'Failed to fetch profile.',
                    error: error as Error,
                })
            })
    }

    stop() {
        // the matrix js sdk technically returns an abortable promise
        // at the moment there is no harm in just ignoring the result
    }
}
