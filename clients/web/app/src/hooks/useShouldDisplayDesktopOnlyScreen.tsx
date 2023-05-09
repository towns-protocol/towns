// import { useMemo } from 'react'
import { useDevice } from './useDevice'

const hasMobileQueryParam = new URLSearchParams(window.location.search).get('mobile') !== undefined

export const useShouldDisplayDesktopOnlyScreen = (): boolean => {
    const { isMobile } = useDevice()
    return isMobile && !hasMobileQueryParam
}
