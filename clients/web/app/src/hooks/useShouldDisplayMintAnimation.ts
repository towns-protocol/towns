import { useSpaceId } from 'use-zion-client'
import { useStore } from 'store/store'

export const useShouldDisplayMintAnimation = () => {
    const spaceId = useSpaceId()
    const { recentlyMintedSpaceIds } = useStore()
    const shouldDisplayMintAnimation = recentlyMintedSpaceIds.includes(spaceId ?? '')
    return { shouldDisplayMintAnimation }
}
