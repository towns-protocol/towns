/*
  Assert login wallet and the active wallet are the same.
*/

import { createUserIdFromString } from '../types/user-identifier'
import { useAccount } from 'wagmi'
import { useMemo } from 'react'
import { useMyProfile } from './use-my-profile'

export function useCurrentWalletEqualsSignedInAccount(): boolean | undefined {
    const { address: currentWalletAddress } = useAccount()
    const user = useMyProfile()
    const userId = user?.userId
    const signedInWalletAddress = useMemo(() => {
        return userId ? createUserIdFromString(userId)?.accountAddress : undefined
    }, [userId])

    return useMemo(
        () =>
            currentWalletAddress !== undefined && signedInWalletAddress !== undefined
                ? currentWalletAddress.toLowerCase() === signedInWalletAddress.toLowerCase()
                : undefined,
        [currentWalletAddress, signedInWalletAddress],
    )
}
