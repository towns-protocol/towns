import { isTransferEthData, isTransferTokensData, isWithdrawData } from '@towns/userops'
import { useMemo } from 'react'
import { useDecodedCallData } from './useDecodedCallData'

export function useToAddress() {
    const currOpDecodedCallData = useDecodedCallData()

    const toAddress = useMemo(() => {
        if (isTransferEthData(currOpDecodedCallData)) {
            return currOpDecodedCallData.toAddress
        }

        if (isTransferTokensData(currOpDecodedCallData) || isWithdrawData(currOpDecodedCallData)) {
            return currOpDecodedCallData.functionData.recipient
        }
    }, [currOpDecodedCallData])

    return toAddress
}
