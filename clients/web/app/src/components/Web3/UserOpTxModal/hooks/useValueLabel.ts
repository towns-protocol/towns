import { isPrepayMembershipData, selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import { useMemo } from 'react'
import { useMyAbstractAccountAddress } from './useMyAbstractAccountAddress'
import { useIsJoinSpace } from './useIsJoinSpace'

export function useValueLabel() {
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const currOpDecodedCallData = userOpsStore(
        (s) => selectUserOpsByAddress(myAbstractAccountAddress, s)?.current?.decodedCallData,
    )
    const isJoinSpace = useIsJoinSpace()
    const valueLabel = useMemo(() => {
        if (isPrepayMembershipData(currOpDecodedCallData)) {
            const { supply } = currOpDecodedCallData.functionData
            return `Seats x ${supply}`
        } else if (isJoinSpace) {
            return 'Membership'
        } else if (currOpDecodedCallData?.functionHash === 'tip') {
            return 'Tip'
        }
    }, [currOpDecodedCallData, isJoinSpace])

    return valueLabel
}
