import { useEffect, useRef } from 'react'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'

export function useJoinTransactionModalShownAnalyticsEvent(args: {
    spaceId: string | undefined
    spaceName: string | undefined
    isJoiningSpace: boolean
    balanceIsLessThanCost: boolean
}) {
    const { spaceId, spaceName, isJoiningSpace, balanceIsLessThanCost } = args
    const { joinTransactionModalShown } = useJoinFunnelAnalytics()
    const triggered = useRef(false)

    useEffect(() => {
        if (isJoiningSpace && !triggered.current) {
            joinTransactionModalShown({
                spaceId,
                spaceName,
                funds: balanceIsLessThanCost ? 'insufficient' : 'sufficient',
            })
            triggered.current = true
        }
    }, [spaceId, spaceName, joinTransactionModalShown, balanceIsLessThanCost, isJoiningSpace])
}
