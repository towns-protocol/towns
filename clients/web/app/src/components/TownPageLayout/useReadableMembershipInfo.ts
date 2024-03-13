import { useMemo } from 'react'
import { useMembershipInfo } from 'use-towns-client'
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
        return data
    }

    return {
        ...data,
        price: transformPrice(Number(data.price)),
        maxSupply: transformLimit(Number(data.maxSupply)),
        currency: transformCurrency(data.currency as string),
        totalSupply: transformTotalSupply(Number(data.totalSupply)),
    }
}

function transformPrice(price: number) {
    switch (price) {
        case 0:
            return 'Free'
        default:
            return price
    }
}

function transformLimit(limit: number) {
    return limit
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
