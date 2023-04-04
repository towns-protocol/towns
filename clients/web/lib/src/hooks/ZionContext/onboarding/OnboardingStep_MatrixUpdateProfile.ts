import { UserEvent } from 'matrix-js-sdk'
import { ObState_UpdateProfile } from './IOnboardingState'
import { OnboardingStepEvent } from './IOnboardingStep'
import { IOnboardingStep_Matrix } from './IOnboardingStep_Matrix'

/**
 * UserProfile
 * Make sure we have an avatar an display name
 */
export class OnboardingStep_MatrixUpdateProfile extends IOnboardingStep_Matrix<ObState_UpdateProfile> {
    get state(): ObState_UpdateProfile {
        return {
            kind: 'update-profile',
            bNeedsAvatar:
                this.matrixUser?.avatarUrl === null ||
                this.matrixUser?.avatarUrl === undefined ||
                this.matrixUser.avatarUrl === '',
            bNeedsDisplayName:
                this.matrixUser?.displayName === null ||
                this.matrixUser?.displayName === undefined ||
                this.matrixUser.displayName === '' ||
                this.matrixUserId.indexOf(this.matrixUser.displayName) >= 0,
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
        if (!this.matrixUser) {
            throw new Error('OnboardingStep_MatrixUpdateProfile::matrixUser is undefined')
        }
        this.matrixUser?.on(UserEvent.DisplayName, this.onUserUpdatedCB)
        this.matrixUser?.on(UserEvent.AvatarUrl, this.onUserUpdatedCB)
    }

    stop() {
        this.matrixUser?.off(UserEvent.DisplayName, this.onUserUpdatedCB)
        this.matrixUser?.off(UserEvent.AvatarUrl, this.onUserUpdatedCB)
    }

    private onUserUpdatedCB = () => {
        this.emit(OnboardingStepEvent.StateUpdate, this.state, this.isComplete)
    }
}
