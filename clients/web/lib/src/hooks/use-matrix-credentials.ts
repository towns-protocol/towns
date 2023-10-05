import { useCredentialStore } from '../store/use-credential-store'
import { useMatrixStore } from '../store/use-matrix-store'

/// combines the matrix credentials and login status into a single hook
/// credentials are stored in local storage
/// login status is stored in the matrix store, and is used to show the login screen
export function useMatrixCredentials() {
    const credentials = useCredentialStore((state) => state.matrixCredentialsMap[''] ?? undefined)
    const { loginStatus, loginError } = useMatrixStore()
    const isAuthenticated = credentials?.accessToken !== undefined

    return {
        accessToken: credentials?.accessToken,
        deviceId: credentials?.deviceId,
        userId: credentials?.userId,
        username: credentials?.username,
        loggedInWalletAddress: credentials?.loggedInWalletAddress,
        isAuthenticated,
        loginStatus,
        loginError,
    }
}
