import { ObState_Loading } from './IOnboardingState'
import { OnboardingStepEvent } from './IOnboardingStep'
import { IOnboardingStep_Casablanca } from './IOnboardingStep_Casablanca'

/***
 * Load profile
 * Always runs, necessary for rest of calculations
 * On start, fetch the profile, on complete, update local state to complete
 * and emit a new state
 * On error, emit an error state
 */
export class OnboardingStep_CasablancaLoadProfile extends IOnboardingStep_Casablanca<ObState_Loading> {
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
        setTimeout(() => {
            const isComplete = true
            this.emit(OnboardingStepEvent.StateUpdate, this.state, isComplete)
        })
    }

    stop() {
        // todo: abort the request
    }
}
