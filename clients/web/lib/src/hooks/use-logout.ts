import { useZionContext } from '../components/ZionContextProvider'
import { useCallback } from 'react'
import { useCredentialStore } from '../store/use-credential-store'
import { useMatrixStore } from '../store/use-matrix-store'
import { LoginStatus } from './login'

export const useLogout = () => {
    const { casablancaServerUrl } = useZionContext()
    const { setLoginStatus } = useMatrixStore()
    const { setCasablancaCredentials } = useCredentialStore()

    const { client } = useZionContext()

    return useCallback(
        async function (): Promise<void> {
            setLoginStatus(LoginStatus.LoggingOut)
            if (client) {
                try {
                    await client.logout()
                    console.log('Logged out')
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (ex: any) {
                    console.error('Error logging out:', (ex as Error)?.stack)
                }
            }

            setLoginStatus(LoginStatus.LoggedOut)
            if (casablancaServerUrl) {
                setCasablancaCredentials(casablancaServerUrl, null)
            }
        },
        [setLoginStatus, client, casablancaServerUrl, setCasablancaCredentials],
    )
}
