import { useTownsContext } from '../components/TownsContextProvider'
import { useCallback } from 'react'
import { useCredentialStore } from '../store/use-credential-store'
import { useCasablancaStore } from '../store/use-casablanca-store'
import { LoginStatus } from './login'

export const useLogout = () => {
    const { casablancaServerUrl } = useTownsContext()
    const { setLoginStatus } = useCasablancaStore()
    const { setCasablancaCredentials } = useCredentialStore()

    const { client } = useTownsContext()

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
                    throw new Error('Error logging out')
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
