'use client'

import { AuthStatus } from '@towns-protocol/sdk'
import { useTowns } from './useTowns'
import type { ObservableConfig } from './useObservable'

/**
 * Hook to get the auth status of the user connection with the Towns network.
 * @param config - Configuration options for the observable.
 * @returns An object containing the current AuthStatus status and boolean flags for each possible status.
 */
export const useTownsAuthStatus = (
    config?: ObservableConfig.FromObservable<AuthStatus>,
) => {
    const { data: status } = useTowns((s) => s.riverAuthStatus, config)
    return {
        /** The current AuthStatus of the user connection with the Towns network. */
        status,
        /** Whether the user connection with the Towns network is initializing. */
        isInitializing: status === AuthStatus.Initializing,
        /** Whether the user connection with the Towns network is evaluating credentials. */
        isEvaluatingCredentials: status === AuthStatus.EvaluatingCredentials,
        /** Whether the user connection with the Towns network is credentialed. */
        isCredentialed: status === AuthStatus.Credentialed,
        /** Whether the user connection with the Towns network is connecting to Towns. */
        isConnectingToTowns: status === AuthStatus.ConnectingToRiver,
        /** Whether the user connection with the Towns network is connected to Towns. */
        isConnectedToTowns: status === AuthStatus.ConnectedToRiver,
        /** Whether the user connection with the Towns network is disconnected. */
        isDisconnected: status === AuthStatus.Disconnected,
        /** Whether the user connection with the Towns network is in an error state. */
        isError: status === AuthStatus.Error,
    }
}
