import { useMemo } from 'react'
import { useCredentialStore } from '../store/use-credential-store'

export function useLoggedInWalletAddress({
    casablancaServerUrl,
}: {
    casablancaServerUrl: string | undefined
}) {
    const riverCredentials = useCredentialStore(
        (state) => state.casablancaCredentialsMap[casablancaServerUrl ?? ''] ?? undefined,
    )
    return useMemo(() => {
        return riverCredentials?.loggedInWalletAddress
    }, [riverCredentials])
}
