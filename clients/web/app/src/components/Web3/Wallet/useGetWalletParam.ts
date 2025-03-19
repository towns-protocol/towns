import { useSearchParams } from 'react-router-dom'
import { Address } from 'use-towns-client'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'

export function useGetAssetSourceParam() {
    const [searchParams] = useSearchParams()
    return searchParams.get('assetSource') as Address | undefined
}

export function useIsAAWallet() {
    const currentWallet = useGetAssetSourceParam()
    const { data: aaAdress } = useMyAbstractAccountAddress()
    return currentWallet === aaAdress
}

export function isAddress(value: string | undefined): value is Address {
    if (!value) {
        return false
    }
    return /^0x[a-fA-F0-9]{40}$/.test(value)
}
