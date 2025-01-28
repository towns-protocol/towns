import { isPrepayMembershipData, selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import { useMemo } from 'react'
import { useMyAbstractAccountAddress } from './useMyAbstractAccountAddress'

export function useValueLabel() {
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const currOpDecodedCallData = userOpsStore(
        (s) => selectUserOpsByAddress(myAbstractAccountAddress, s)?.current?.decodedCallData,
    )
    const valueLabel = useMemo(() => {
        if (isPrepayMembershipData(currOpDecodedCallData)) {
            const { supply } = currOpDecodedCallData.functionData
            return `Seats x ${supply}`
        } else if (
            currOpDecodedCallData?.functionHash === 'joinSpace' ||
            currOpDecodedCallData?.functionHash === 'joinSpace_linkWallet'
        ) {
            return 'Membership'
        } else if (currOpDecodedCallData?.functionHash === 'tip') {
            return 'Tip'
        }
    }, [currOpDecodedCallData])

    return valueLabel
}
