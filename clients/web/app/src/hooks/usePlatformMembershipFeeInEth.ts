import { ethers } from 'ethers'
import { usePlatformMembershipFee } from 'use-towns-client'

export function usePlatformMembershipFeeInEth() {
    const query = usePlatformMembershipFee({
        select: (data) => ethers.utils.formatEther(data),
    })
    return query
}
