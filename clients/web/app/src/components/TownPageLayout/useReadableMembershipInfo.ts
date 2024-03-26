import { useMemo } from 'react'
import { useMembershipInfo } from 'use-towns-client'
import { BigNumberish, ethers } from 'ethers'
import { ETH_ADDRESS } from '@components/Web3/utils'

export function useReadableMembershipInfo(networkId: string) {
    const response = useMembershipInfo(networkId)

    return useMemo(() => {
        return {
            ...response,
            data: transformData(response.data),
        }
    }, [response])
}

function transformData(data: ReturnType<typeof useMembershipInfo>['data']) {
    if (!data) {
        return
    }

    return {
        ...data,
        price: transformPrice(data.price as BigNumberish),
        maxSupply: transformLimit(Number(data.maxSupply)),
        currency: transformCurrency(data.currency as string),
        totalSupply: transformTotalSupply(Number(data.totalSupply)),
        duration: transformDuration(Number(data.duration)),
    }
}

function transformPrice(price: BigNumberish) {
    const eth = ethers.utils.formatEther(price)

    switch (eth) {
        case '0.0':
            return 'Free'
        default:
            return eth
    }
}

function transformLimit(limit: number) {
    return limit
}

function transformDuration(duration: number) {
    return duration
}

function transformTotalSupply(totalSupply: number) {
    return totalSupply
}

function transformCurrency(currency: string) {
    switch (currency) {
        case ETH_ADDRESS:
        default:
            return 'ETH'
    }
}
