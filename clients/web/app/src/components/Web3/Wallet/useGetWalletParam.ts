import { useSearchParams } from 'react-router-dom'
import { Address, useMyUserId } from 'use-towns-client'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'

export function useGetAssetSourceParam() {
    const [searchParams] = useSearchParams()
    return searchParams.get('assetSource') as Address | undefined
}

export function useIsAAWallet() {
    const currentWallet = useGetAssetSourceParam()
    const userId = useMyUserId()
    const { data: aaAdress } = useAbstractAccountAddress({
        rootKeyAddress: userId as Address,
    })
    return currentWallet === aaAdress
}

export function isAddress(value: string | undefined): value is Address {
    if (!value) {
        return false
    }
    return /^0x[a-fA-F0-9]{40}$/.test(value)
}
