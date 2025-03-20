import { useMemo } from 'react'
import { useTownsContext } from '../components/TownsContextProvider'
import { userIdFromAddress } from '@towns-protocol/sdk'

export const useMyUserId = (): string | undefined => {
    const { signerContext } = useTownsContext()
    return useMemo(() => {
        return signerContext ? userIdFromAddress(signerContext.creatorAddress) : undefined
    }, [signerContext])
}
