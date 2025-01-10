import { selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import { useMemo } from 'react'
import { useMyAbstractAccountAddress } from './useMyAbstractAccountAddress'

export function useValueLabel() {
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const currOpDecodedCallData = userOpsStore(
        (s) => selectUserOpsByAddress(myAbstractAccountAddress, s)?.currOpDecodedCallData,
    )
    const valueLabel = useMemo(() => {
        if (currOpDecodedCallData?.type === 'prepayMembership' && currOpDecodedCallData.data) {
            const { supply } = currOpDecodedCallData.data
            return `Seats x ${supply}`
        } else if (
            currOpDecodedCallData?.type === 'joinSpace' ||
            currOpDecodedCallData?.type === 'joinSpace_linkWallet'
        ) {
            return 'Membership'
        } else if (currOpDecodedCallData?.type === 'tip') {
            return 'Tip'
        }
    }, [currOpDecodedCallData])

    return valueLabel
}
