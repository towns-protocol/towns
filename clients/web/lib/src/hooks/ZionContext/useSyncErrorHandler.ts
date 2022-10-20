import { useEffect, useState } from 'react'
import { ZionClient } from 'client/ZionClient'
import { ClientEvent } from 'matrix-js-sdk'
import { SyncState } from 'matrix-js-sdk/lib/sync'
import { useCredentialStore } from '../../store/use-credential-store'
import { useMatrixStore } from '../../store/use-matrix-store'
import { LoginStatus } from '../../hooks/login'

export function useSyncErrorHandler(client?: ZionClient) {
    const { setLoginStatus } = useMatrixStore()
    const { setAccessToken } = useCredentialStore()
    const [syncError, setSyncError] = useState<string>()
    useEffect(() => {
        if (!client) {
            return
        }

        const onSync = (state: SyncState, prevState: unknown, res: unknown) => {
            if (state === SyncState.Error) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
                if ((res as any)?.error?.errcode === 'M_UNKNOWN_TOKEN') {
                    console.log('Access token no longer valid, logging out')
                    try {
                        client.stopClient()
                    } catch (e) {
                        console.log('Error stopping client', e)
                    }
                    setSyncError('M_UNKNOWN_TOKEN')
                    setLoginStatus(LoginStatus.LoggedOut)
                    setAccessToken('')
                }
            }
        }

        client.on(ClientEvent.Sync, onSync)
        return () => {
            client.off(ClientEvent.Sync, onSync)
        }
    }, [client, setAccessToken, setLoginStatus])

    return syncError
}
