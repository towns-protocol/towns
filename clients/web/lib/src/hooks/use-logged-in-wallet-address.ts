import { useMemo } from 'react'
import { useCredentialStore } from '../store/use-credential-store'
import { SpaceProtocol } from '../client/ZionClientTypes'

export function useLoggedInWalletAddress({
    matrixServerUrl,
    casablancaServerUrl,
    primaryProtocol,
}: {
    matrixServerUrl: string
    casablancaServerUrl: string | undefined
    primaryProtocol?: SpaceProtocol
}) {
    const isRiver = primaryProtocol === SpaceProtocol.Casablanca

    const matrixCredentials = useCredentialStore(
        (state) => state.matrixCredentialsMap[matrixServerUrl] ?? undefined,
    )

    const riverCredentials = useCredentialStore(
        (state) => state.casablancaCredentialsMap[casablancaServerUrl ?? ''] ?? undefined,
    )

    return useMemo(() => {
        if (isRiver) {
            return riverCredentials?.loggedInWalletAddress
        } else {
            return matrixCredentials?.loggedInWalletAddress
        }
    }, [isRiver, matrixCredentials, riverCredentials])
}
