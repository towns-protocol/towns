/*
  Assert login wallet and the active wallet are the same.
*/

import { useEffect, useMemo, useState } from 'react'
import { getAccountAddress, useMyProfile } from 'use-zion-client'
import { useGetEmbeddedSigner } from '@towns/privy'

// We can probably just remove this hook
export function useCurrentWalletEqualsSignedInAccount(): boolean | undefined {
    const getSigner = useGetEmbeddedSigner()
    const user = useMyProfile()
    const userId = user?.userId
    const signedInWalletAddress = useMemo(() => {
        return userId ? getAccountAddress(userId) : undefined
    }, [userId])
    const [isEqual, setIsEqual] = useState<boolean | undefined>()

    useEffect(() => {
        async function check() {
            try {
                const signer = await getSigner()
                const address = await signer?.getAddress()
                if (!address || !signedInWalletAddress) {
                    setIsEqual(false)
                    return
                }
                setIsEqual(address?.toLowerCase() === signedInWalletAddress?.toLowerCase())
            } catch (error) {
                console.error('useCurrentWalletEqualsSignedInAccount error', error)
                setIsEqual(false)
            }
        }

        check()
    }, [getSigner, signedInWalletAddress])

    return isEqual
}
