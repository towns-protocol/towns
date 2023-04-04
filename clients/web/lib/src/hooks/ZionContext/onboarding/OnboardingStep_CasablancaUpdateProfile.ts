import { ObState_UpdateProfile } from './IOnboardingState'
import { OnboardingStepEvent } from './IOnboardingStep'
import { IOnboardingStep_Casablanca } from './IOnboardingStep_Casablanca'

/**
 * UserProfile
 * Make sure we have an avatar an display name
 */
export class OnboardingStep_CasablancaUpdateProfile extends IOnboardingStep_Casablanca<ObState_UpdateProfile> {
    get state(): ObState_UpdateProfile {
        return {
            kind: 'update-profile',
            bNeedsAvatar: false, // todo, casablanca onboarding
            bNeedsDisplayName: false, // todo, casablanca onboarding
        }
    }

    shouldExecute(): boolean {
        return false
    }

    start() {
        setTimeout(() => {
            const isComplete = true
            this.emit(OnboardingStepEvent.StateUpdate, this.state, isComplete)
        })
    }

    stop() {
        // kill any requests and remove any listeners
    }
}
