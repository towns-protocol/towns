import { isPrepayMembershipData } from '@towns/userops'
import { useMemo } from 'react'
import { useIsJoinSpace } from './useIsJoinSpace'
import { useDecodedCallData } from './useDecodedCallData'

export function useValueLabel() {
    const currOpDecodedCallData = useDecodedCallData()

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
