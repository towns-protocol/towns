import { userOpsStore } from '@towns/userops'
import { useMemo } from 'react'

export function useToAddress() {
    const currOpDecodedCallData = userOpsStore((s) => s.currOpDecodedCallData)

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
