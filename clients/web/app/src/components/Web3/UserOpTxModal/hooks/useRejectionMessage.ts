import { PaymasterErrorCode, selectUserOpsByAddress, userOpsStore } from '@towns/userops'
import { useMemo } from 'react'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'

export function useRejectionMessage() {
    const myAbstractAccountAddress = useMyAbstractAccountAddress().data
    const rejectedSponsorshipReason = userOpsStore(
        (s) => selectUserOpsByAddress(myAbstractAccountAddress, s)?.rejectedSponsorshipReason,
    )

    const rejectionMessage = useMemo(() => {
        if (rejectedSponsorshipReason === PaymasterErrorCode.PAYMASTER_LIMIT_REACHED) {
            return 'Maximum gas sponsorship reached.'
        } else if (rejectedSponsorshipReason === PaymasterErrorCode.DAILY_LIMIT_REACHED) {
            return 'Daily sponsored transactions reached.'
        }
    }, [rejectedSponsorshipReason])

    return rejectionMessage
}
