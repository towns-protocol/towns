import { ethers } from 'ethers'
import { usePlatformMinMembershipPrice } from 'use-towns-client'

export function usePlatformMinMembershipPriceInEth() {
    const query = usePlatformMinMembershipPrice({
        select: (data) => ethers.utils.formatEther(data),
    })
    return query
}
