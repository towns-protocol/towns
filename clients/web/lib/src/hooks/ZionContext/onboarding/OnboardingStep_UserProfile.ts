import { UserEvent } from 'matrix-js-sdk'
import { ObState_UserProfile } from './IOnboardingState'
import { IOnboardingStep, OnboardingStepEvent } from './IOnboardingStep'

/**
 * UserProfile
 * Make sure we have an avatar an display name
 */
export class OnboardingStep_UserProfile extends IOnboardingStep<ObState_UserProfile> {
    get state(): ObState_UserProfile {
        return {
            kind: 'user-profile',
            bNeedsAvatar:
                this.user?.avatarUrl === null ||
                this.user?.avatarUrl === undefined ||
                this.user.avatarUrl === '',
            bNeedsDisplayName:
                this.user?.displayName === null ||
                this.user?.displayName === undefined ||
                this.user.displayName === '' ||
                this.userId.indexOf(this.user.displayName) >= 0,
        }
    }

    private get isComplete(): boolean {
        const state = this.state
        return (
            (!state.bNeedsAvatar || this.opts?.skipAvatar === true) &&
            (!state.bNeedsDisplayName || this.opts?.skipUsername === true)
        )
    }

    shouldExecute(): boolean {
        return !this.isComplete
    }

    start() {
        if (!this.user) {
            throw new Error('OnboardingStep_UserProfile::UserId is undefined')
        }
        this.user?.on(UserEvent.DisplayName, this.onUserUpdatedCB)
        this.user?.on(UserEvent.AvatarUrl, this.onUserUpdatedCB)
    }

    stop() {
        this.user?.off(UserEvent.DisplayName, this.onUserUpdatedCB)
        this.user?.off(UserEvent.AvatarUrl, this.onUserUpdatedCB)
    }

    private onUserUpdatedCB = () => {
        this.emit(OnboardingStepEvent.StateUpdate, this.state, this.isComplete)
    }
}
