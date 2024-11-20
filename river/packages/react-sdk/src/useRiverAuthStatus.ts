'use client'

import { AuthStatus } from '@river-build/sdk'
import { useRiver } from './useRiver'
import type { ObservableConfig } from './useObservable'

/**
 * Hook to get the auth status of the user connection with the River network.
 * @param config - Configuration options for the observable.
 * @returns An object containing the current AuthStatus status and boolean flags for each possible status.
 */
export const useRiverAuthStatus = (config?: ObservableConfig.FromObservable<AuthStatus>) => {
    const { data: status } = useRiver((s) => s.riverAuthStatus, config)
    return {
        /** The current AuthStatus of the user connection with the River network. */
        status,
        /** Whether the user connection with the River network is initializing. */
        isInitializing: status === AuthStatus.Initializing,
        /** Whether the user connection with the River network is evaluating credentials. */
        isEvaluatingCredentials: status === AuthStatus.EvaluatingCredentials,
        /** Whether the user connection with the River network is credentialed. */
        isCredentialed: status === AuthStatus.Credentialed,
        /** Whether the user connection with the River network is connecting to River. */
        isConnectingToRiver: status === AuthStatus.ConnectingToRiver,
        /** Whether the user connection with the River network is connected to River. */
        isConnectedToRiver: status === AuthStatus.ConnectedToRiver,
        /** Whether the user connection with the River network is disconnected. */
        isDisconnected: status === AuthStatus.Disconnected,
        /** Whether the user connection with the River network is in an error state. */
        isError: status === AuthStatus.Error,
    }
}
