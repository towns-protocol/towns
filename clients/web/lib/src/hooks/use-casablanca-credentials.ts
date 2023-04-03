import { useZionContext } from '../components/ZionContextProvider'
import { useCasablancaStore } from '../store/use-casablanca-store'
import { useCredentialStore } from '../store/use-credential-store'

/// combines the matrix credentials and login status into a single hook
/// credentials are stored in local storage
/// login status is stored in the matrix store, and is used to show the login screen
export function useCasablancaCredentials() {
    const { casablancaServerUrl } = useZionContext()
    const credentials = useCredentialStore(
        (state) => state.casablancaCredentialsMap[casablancaServerUrl] ?? undefined,
    )
    const { loginStatus, loginError } = useCasablancaStore()
    const isAuthenticated = credentials?.delegateSig !== undefined

    return {
        userId: credentials?.creatorAddress,
        loggedInWalletAddress: credentials?.loggedInWalletAddress,
        isAuthenticated,
        loginStatus,
        loginError,
    }
}
