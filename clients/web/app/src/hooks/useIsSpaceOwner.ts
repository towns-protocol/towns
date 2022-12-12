import { useMemo } from 'react'
import { useSpaceFromContract, useSpaceId, useWeb3Context } from 'use-zion-client'

export function useIsSpaceOwner(): boolean | null {
    const spaceId = useSpaceId()
    const { accounts } = useWeb3Context()
    const wallet = accounts[0]
    const { isLoading: contractLoading, space: spaceContract } = useSpaceFromContract(spaceId)
    const isOwner = useMemo(() => {
        if (contractLoading) {
            return null
        }
        return wallet === spaceContract?.owner
    }, [contractLoading, spaceContract?.owner, wallet])

    return isOwner
}
