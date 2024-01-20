/*
  Assert login wallet and the active wallet are the same.
*/

import { useAccount } from 'wagmi'
import { useMemo } from 'react'
import { useMyProfile } from './use-my-profile'
import { getAccountAddress } from '../types/user-identifier'

export function useCurrentWalletEqualsSignedInAccount(): boolean | undefined {
    const { address: currentWalletAddress } = useAccount()
    const user = useMyProfile()
    const userId = user?.userId
    const signedInWalletAddress = useMemo(() => {
        return userId ? getAccountAddress(userId) : undefined
    }, [userId])

    return useMemo(
        () =>
            currentWalletAddress !== undefined && signedInWalletAddress !== undefined
                ? currentWalletAddress.toLowerCase() === signedInWalletAddress.toLowerCase()
                : undefined,
        [currentWalletAddress, signedInWalletAddress],
    )
}
