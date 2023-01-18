import { useEffect } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { useCredentialStore } from '../store/use-credential-store'
import { useMatrixStore } from '../store/use-matrix-store'
import { LoginStatus } from './login'

/// combines the matrix credentials and login status into a single hook
/// credentials are stored in local storage
/// login status is stored in the matrix store, and is used to show the login screen
export function useMatrixCredentials() {
    const { homeServerUrl } = useZionContext()
    const credentials = useCredentialStore(
        (state) => state.matrixCredentialsMap[homeServerUrl] ?? undefined,
    )
    const { loginStatus, loginError, setLoginStatus } = useMatrixStore()

    const isAuthenticated = credentials?.accessToken !== undefined

    useEffect(() => {
        if (isAuthenticated) {
            setLoginStatus(LoginStatus.LoggedIn)
        }
    }, [isAuthenticated, setLoginStatus])

    return {
        accessToken: credentials?.accessToken,
        deviceId: credentials?.deviceId,
        userId: credentials?.userId,
        username: credentials?.username,
        isAuthenticated,
        loginStatus,
        loginError,
    }
}
