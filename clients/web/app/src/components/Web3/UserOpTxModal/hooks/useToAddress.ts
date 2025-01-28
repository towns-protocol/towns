import {
    isTransferEthData,
    isTransferTokensData,
    isWithdrawData,
    selectUserOpsByAddress,
    userOpsStore,
} from '@towns/userops'
import { useMemo } from 'react'
import { useMyAbstractAccountAddress } from './useMyAbstractAccountAddress'

export function useToAddress() {
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const currOpDecodedCallData = userOpsStore(
        (s) => selectUserOpsByAddress(myAbstractAccountAddress, s)?.current?.decodedCallData,
    )

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
