import { useMemo } from 'react'
import { SpaceAddressFromSpaceId, useChannelContext, useTownsContext } from 'use-towns-client'
import { env } from '../utils/environment'

const useAllowedIds = () => {
    const allowedIds = useMemo(() => {
        const ids = env.VITE_TRADING_TOWNS ?? ''
        return new Set(ids.replaceAll(' ', '').split(','))
    }, [])
    return { allowedIds }
}

export const useShowWallet = () => {
    const { spaces } = useTownsContext()
    const { allowedIds } = useAllowedIds()
    const showWallet = useMemo(() => {
        const spaceIds = new Set(
            spaces.map((space) => SpaceAddressFromSpaceId(space.id).toLowerCase()),
        )
        for (const id of allowedIds) {
            if (spaceIds.has(id)) {
                return true
            }
        }
        return false
    }, [spaces, allowedIds])
    return { showWallet: showWallet || env.DEV }
}

export const useIsTradingEnabledInCurrentSpace = () => {
    const { spaceId } = useChannelContext()
    const { allowedIds } = useAllowedIds()
    const isTradingEnabled = useMemo(() => {
        if (!spaceId) {
            return false
        }
        const spaceAddress = SpaceAddressFromSpaceId(spaceId).toLowerCase()
        return allowedIds.has(spaceAddress)
    }, [spaceId, allowedIds])
    return { isTradingEnabled: isTradingEnabled || env.DEV }
}
