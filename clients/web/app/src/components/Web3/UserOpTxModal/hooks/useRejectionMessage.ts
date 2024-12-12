import { PaymasterErrorCode, userOpsStore } from '@towns/userops'
import { useMemo } from 'react'

export function useRejectionMessage() {
    const rejectedSponsorshipReason = userOpsStore((s) => s.rejectedSponsorshipReason)

    const rejectionMessage = useMemo(() => {
        if (rejectedSponsorshipReason === PaymasterErrorCode.PAYMASTER_LIMIT_REACHED) {
            return 'Maximum gas sponsorship reached.'
        } else if (rejectedSponsorshipReason === PaymasterErrorCode.DAILY_LIMIT_REACHED) {
            return 'Daily sponsored transactions reached.'
        }
    }, [rejectedSponsorshipReason])

    return rejectionMessage
}
