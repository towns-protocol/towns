'use client'

import { AuthStatus } from '@river-build/sdk'
import { useRiver } from './useRiver'
import type { ObservableConfig } from './useObservable'

export const useRiverAuthStatus = (config?: ObservableConfig.FromObservable<AuthStatus>) => {
    const { data: status } = useRiver((s) => s.riverAuthStatus, config)
    return {
        status,
        isInitializing: status === AuthStatus.Initializing,
        isEvaluatingCredentials: status === AuthStatus.EvaluatingCredentials,
        isCredentialed: status === AuthStatus.Credentialed,
        isConnectingToRiver: status === AuthStatus.ConnectingToRiver,
        isConnectedToRiver: status === AuthStatus.ConnectedToRiver,
        isDisconnected: status === AuthStatus.Disconnected,
        isError: status === AuthStatus.Error,
    }
}
