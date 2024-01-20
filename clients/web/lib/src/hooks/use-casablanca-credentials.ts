import { useZionContext } from '../components/ZionContextProvider'
import { useCasablancaStore } from '../store/use-casablanca-store'
import { useCredentialStore } from '../store/use-credential-store'
import { ethers } from 'ethers'

/// combines the credentials and login status into a single hook
/// credentials and login status are stored in local storage, and is
/// used to show the login screen
export function useCasablancaCredentials() {
    const { casablancaServerUrl } = useZionContext()
    const credentials = useCredentialStore(
        (state) => state.casablancaCredentialsMap[casablancaServerUrl ?? ''] ?? undefined,
    )
    const { loginStatus, loginError } = useCasablancaStore()
    const isAuthenticated = credentials?.delegateSig !== undefined
    return {
        //Our flow assumes that userId can be empty in some cases, so we need to handle it
        userId: credentials?.creatorAddress
            ? prepareAndValidateAddress(credentials?.creatorAddress)
            : credentials?.creatorAddress,
        loggedInWalletAddress: credentials?.loggedInWalletAddress,
        isAuthenticated,
        loginStatus,
        loginError,
    }
}

//Should be changed to checksum address when HNT-1576 will be done
function prepareAndValidateAddress(address: string | undefined) {
    if (!address) {
        return
    }
    address = (address.length == 40 ? '0x' + address : address).toLowerCase()
    if (!ethers.utils.isAddress(address)) {
        throw new Error('invalid address')
    }
    return address
}
