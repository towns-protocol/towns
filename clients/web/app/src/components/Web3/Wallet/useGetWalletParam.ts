import { useSearchParams } from 'react-router-dom'
import { Address, useMyUserId } from 'use-towns-client'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'

export function useGetWalletParam() {
    const [searchParams] = useSearchParams()
    return searchParams.get('wallet') as Address | undefined
}

export function useIsAAWallet() {
    const currentWallet = useGetWalletParam()
    const userId = useMyUserId()
    const { data: aaAdress } = useAbstractAccountAddress({
        rootKeyAddress: userId as Address,
    })
    return currentWallet === aaAdress
}
