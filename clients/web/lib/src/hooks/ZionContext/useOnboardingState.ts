import { useEffect, useState } from 'react'
import { ZionClient } from '../../client/ZionClient'
import { IOnboardingState, ObState_Error } from './onboarding/IOnboardingState'
import { IOnboardingStep, OnboardingStepEvent } from './onboarding/IOnboardingStep'
import { OnboardingStep_Done } from './onboarding/OnboardingStep_Done'
import { OnboardingStep_MatrixLoadProfile } from './onboarding/OnboardingStep_MatrixLoadProfile'
import { OnboardingStep_MatrixUpdateProfile } from './onboarding/OnboardingStep_MatrixUpdateProfile'
import { OnboardingStep_WelcomeSplash } from './onboarding/OnboardingStep_WelcomeSplash'
import isEqual from 'lodash/isEqual'
import { MatrixClient } from 'matrix-js-sdk'
import { Client as CasablancaClient } from '@river/sdk'
import { OnboardingStep_CasablancaLoadProfile } from './onboarding/OnboardingStep_CasablancaLoadProfile'
import { OnboardingStep_CasablancaUpdateProfile } from './onboarding/OnboardingStep_CasablancaUpdateProfile'

const initialState: IOnboardingState = { kind: 'none' }

const CASABLANCA_ONBOARDING_STEPS = [
    OnboardingStep_CasablancaLoadProfile,
    OnboardingStep_CasablancaUpdateProfile,
    OnboardingStep_WelcomeSplash,
    OnboardingStep_Done,
]

export function useOnboardingState_Casablanca(
    client: ZionClient | undefined,
    casablancaClient: CasablancaClient | undefined,
) {
    const userId = casablancaClient?.userId
    return useOnboardingState(
        'casablanca',
        client,
        casablancaClient,
        userId,
        CASABLANCA_ONBOARDING_STEPS,
    )
}

const MATRIX_ONBOARDING_STEPS = [
    OnboardingStep_MatrixLoadProfile,
    OnboardingStep_MatrixUpdateProfile,
    OnboardingStep_WelcomeSplash,
    OnboardingStep_Done,
]

export function useOnboardingState_Matrix(
    client: ZionClient | undefined,
    matrixClient: MatrixClient | undefined,
) {
    const matrixUserId = matrixClient?.getUserId() ?? undefined
    return useOnboardingState('matrix', client, matrixClient, matrixUserId, MATRIX_ONBOARDING_STEPS)
}

function useOnboardingState<TNetworkClient>(
    name: string,
    client: ZionClient | undefined,
    networkClient: TNetworkClient | undefined,
    userId: string | undefined,
    steps: Array<
        new (client: ZionClient, networkClient: TNetworkClient, userId: string) => IOnboardingStep
    >,
): IOnboardingState {
    // single state variable that we report back to the world
    const [state, setState] = useState<IOnboardingState>(initialState)
    // step index that runs our state machine
    const [stepIndex, setStepIndex] = useState(0)
    // step queue machinery:
    useEffect(() => {
        // initial condidtions
        if (!client || !networkClient || !userId) {
            setState(initialState)
            setStepIndex(0)
            return
        }

        // helpers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const log = (message: string, ...optionalParams: any[]) => {
            console.log(
                `=== useOnboardingState ${name} step: ${stepIndex} ${message}`,
                optionalParams,
            )
        }

        const advanceState = () => {
            setStepIndex((prev) => prev + 1)
        }

        const onStateUpdate = (newState: IOnboardingState, isComplete: boolean) => {
            log('onStateUpdate: ', {
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
            log('error: ', error)
            // maybe someday figure out retries?
            setState((prev) => ({
                ...error,
                previousErrors: getPreviousErrors(prev),
            }))
        }

        // start
        log(`start`)
        // instantiate the step
        const step = new steps[stepIndex](client, networkClient, userId)
        // start or advance
        if (step.shouldExecute()) {
            const state = step.state
            log(`state:`, state)
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
    }, [client, name, networkClient, stepIndex, steps, userId])

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
