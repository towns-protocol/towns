import { useConnectivity } from 'use-towns-client'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'

export function useMyAbstractAccountAddress() {
    const { loggedInWalletAddress } = useConnectivity()
    return useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })
}
