import { useMemo } from 'react'
import { useTownsContext } from 'use-towns-client'
import { env } from '../utils/environment'
export const useIsHNTMember = () => {
    const { spaces } = useTownsContext()
    const isHNTMember = useMemo(() => {
        const networkId = '10c87bb04477151743070b45a3426938128896ac5d0000000000000000000000'
        return spaces.some((space) => space.id === networkId)
    }, [spaces])
    return { isHNTMember: isHNTMember || env.DEV }
}
