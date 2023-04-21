import { useEffect, useState } from 'react'
import { ZionClient } from '../../client/ZionClient'
import { ClientEvent, MatrixClient } from 'matrix-js-sdk'
import { SyncState } from 'matrix-js-sdk/lib/sync'
import { useCredentialStore } from '../../store/use-credential-store'
import { useMatrixStore } from '../../store/use-matrix-store'
import { LoginStatus } from '../../hooks/login'

export function useSyncErrorHandler(
    homeServerUrl: string,
    client: ZionClient | undefined,
    matrixClient: MatrixClient | undefined,
) {
    const { setLoginStatus } = useMatrixStore()
    const { setMatrixCredentials } = useCredentialStore()
    const [syncError, setSyncError] = useState<string>()
    useEffect(() => {
        if (!client || !matrixClient) {
            return
        }

        const onSync = (state: SyncState, prevState: unknown, res: unknown) => {
            if (state === SyncState.Error) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
                if ((res as any)?.error?.errcode === 'M_UNKNOWN_TOKEN') {
                    const stopClientFN = async () => {
                        console.log('Access token no longer valid, logging out')
                        setSyncError('M_UNKNOWN_TOKEN')
                        try {
                            await client.stopMatrixClient()
                        } catch (e) {
                            console.log('Error stopping client', e)
                        }
                        setLoginStatus(LoginStatus.LoggedOut)
                        setMatrixCredentials(homeServerUrl, null)
                    }
                    void stopClientFN()
                }
            }
        }

        matrixClient.on(ClientEvent.Sync, onSync)
        return () => {
            matrixClient.off(ClientEvent.Sync, onSync)
        }
    }, [client, setMatrixCredentials, setLoginStatus, homeServerUrl, matrixClient])

    return syncError
}
