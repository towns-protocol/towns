import { useEffect, useState } from 'react'
import { ZionClient } from '../../client/ZionClient'
import { IOnboardingState, ObState_Error } from './onboarding/IOnboardingState'
import { OnboardingStepEvent } from './onboarding/IOnboardingStep'
import { OnboardingStep_Done } from './onboarding/OnboardingStep_Done'
import { OnboardingStep_LoadProfile } from './onboarding/OnboardingStep_LoadProfile'
import { OnboardingStep_UserProfile } from './onboarding/OnboardingStep_UserProfile'
import { OnboardingStep_WelcomeSplash } from './onboarding/OnboardingStep_WelcomeSplash'
import { isEqual } from 'lodash'

const ONBOARDING_STEPS = [
    OnboardingStep_LoadProfile,
    OnboardingStep_UserProfile,
    OnboardingStep_WelcomeSplash,
    OnboardingStep_Done,
]

const initialState: IOnboardingState = { kind: 'none' }

export function useOnboardingState(client?: ZionClient): IOnboardingState {
    // single state variable that we report back to the world
    const [state, setState] = useState<IOnboardingState>(initialState)
    // step index that runs our state machine
    const [stepIndex, setStepIndex] = useState(0)
    // if the client is defined, userId should be defined as well
    const userId = client?.getUserId()
    // step queue machinery:
    useEffect(() => {
        console.log(`=== useOnboardingState step: ${stepIndex}`)
        // initial condidtions
        if (!client || !userId) {
            setState(initialState)
            setStepIndex(0)
            return
        }
        // helpers
        const advanceState = () => {
            setStepIndex((prev) => prev + 1)
        }

        const onStateUpdate = (newState: IOnboardingState, isComplete: boolean) => {
            console.log('useOnboardingState onStateUpdate: ', {
                newState,
                isComplete,
            })
            if (isComplete) {
                advanceState()
            } else {
                setState((prev) => (isEqual(prev, newState) ? prev : newState))
            }
        }

        const onError = (error: ObState_Error) => {
            console.log('useOnboardingState error: ', error)
            // maybe someday figure out retries?
            setState((prev) => ({
                ...error,
                previousErrors: getPreviousErrors(prev),
            }))
        }

        // instantiate the step
        const step = new ONBOARDING_STEPS[stepIndex](client, userId)
        // start or advance
        if (step.shouldExecute()) {
            const state = step.state
            console.log(`=== useOnboardingState state:`, state)
            setState(state)
            step.on(OnboardingStepEvent.StateUpdate, onStateUpdate)
            step.on(OnboardingStepEvent.Error, onError)
            step.start()
            return () => {
                step.off(OnboardingStepEvent.StateUpdate, onStateUpdate)
                step.off(OnboardingStepEvent.Error, onError)
                step.stop()
            }
        } else {
            advanceState()
        }
    }, [client, stepIndex, userId])

    return state
}

function getPreviousErrors(
    state: IOnboardingState,
): { message: string; error?: Error }[] | undefined {
    if (state.kind === 'error') {
        return (state.previousErrors ?? []).concat({
            message: state.message,
            error: state.error,
        })
    } else {
        return undefined
    }
}
