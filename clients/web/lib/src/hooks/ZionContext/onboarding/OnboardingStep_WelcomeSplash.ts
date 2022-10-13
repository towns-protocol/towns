/* eslint-disable @typescript-eslint/no-empty-function */
import { ObState_Toast } from './IOnboardingState'
import { IOnboardingStep, OnboardingStepEvent } from './IOnboardingStep'

/***
 * Welcome splash
 * proof of concept for a timed onboarding state
 */
export class OnboardingStep_WelcomeSplash extends IOnboardingStep<ObState_Toast> {
    get state(): ObState_Toast {
        return {
            kind: 'toast',
            message: 'Welcome To Zion!',
        }
    }

    shouldExecute(): boolean {
        // if we haven't explicitly turned it on, skip this step
        return this.opts?.showWelcomeSpash === true
    }

    start() {
        setTimeout(() => {
            this.emit(OnboardingStepEvent.StateUpdate, this.state, true)
        }, 1 * 1000)
    }

    stop() {}
}
