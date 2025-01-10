import { selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import { useMemo } from 'react'
import { useMyAbstractAccountAddress } from './useMyAbstractAccountAddress'

export function useToAddress() {
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const currOpDecodedCallData = userOpsStore(
        (s) => selectUserOpsByAddress(myAbstractAccountAddress, s)?.currOpDecodedCallData,
    )

    const toAddress = useMemo(() => {
        const type = currOpDecodedCallData?.type
        if (
            (type === 'transferEth' || type === 'transferTokens' || type === 'withdraw') &&
            currOpDecodedCallData?.data
        ) {
            return currOpDecodedCallData.data.recipient
        }
    }, [currOpDecodedCallData])

    return toAddress
}
