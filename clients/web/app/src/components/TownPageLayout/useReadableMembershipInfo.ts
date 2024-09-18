import { useMemo } from 'react'
import { useMembershipInfo } from 'use-towns-client'
import { BigNumberish, utils } from 'ethers'
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
        maxSupply: Number(data.maxSupply),
        currency: transformCurrency(data.currency as string),
        totalSupply: data.totalSupply,
        duration: Number(data.duration),
        prepaidSupply: data.prepaidSupply,
        remainingFreeSupply: data.remainingFreeSupply,
    }
}

function transformPrice(price: BigNumberish) {
    const eth = utils.formatEther(price)

    switch (eth) {
        case '0.0':
            return 'Free'
        default:
            return eth
    }
}

function transformCurrency(currency: string) {
    switch (currency) {
        case ETH_ADDRESS:
        default:
            return 'ETH'
    }
}
