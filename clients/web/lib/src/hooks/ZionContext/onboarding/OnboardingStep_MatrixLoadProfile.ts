import { ObState_Loading } from './IOnboardingState'
import { OnboardingStepEvent } from './IOnboardingStep'
import { IOnboardingStep_Matrix } from './IOnboardingStep_Matrix'

/***
 * Load profile
 * Always runs, necessary for rest of calculations
 * On start, fetch the profile, on complete, update local state to complete
 * and emit a new state
 * On error, emit an error state
 */
export class OnboardingStep_MatrixLoadProfile extends IOnboardingStep_Matrix<ObState_Loading> {
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
            .getProfileInfo(this.matrixUserId)
            .then(() => {
                const isComplete = true
                this.emit(OnboardingStepEvent.StateUpdate, this.state, isComplete)
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
