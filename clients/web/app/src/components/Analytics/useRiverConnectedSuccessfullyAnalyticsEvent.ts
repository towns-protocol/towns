import { useEffect } from 'react'
import { useTownsClient } from 'use-towns-client'
import { useJoinFunnelAnalytics } from './useJoinFunnelAnalytics'

export function useRiverConnectedSuccessfullyAnalyticsEvent() {
    const { clientSingleton } = useTownsClient()
    const { riverConnectedSuccessfully } = useJoinFunnelAnalytics()

    useEffect(() => {
        const _riverConnectedSuccessfully = () => {
            riverConnectedSuccessfully()
        }
        clientSingleton?.on('onCasablancaClientCreated', _riverConnectedSuccessfully)
        return () => {
            clientSingleton?.off('onCasablancaClientCreated', _riverConnectedSuccessfully)
        }
    }, [clientSingleton, riverConnectedSuccessfully])
}
