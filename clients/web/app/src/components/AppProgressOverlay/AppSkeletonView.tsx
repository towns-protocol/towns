import React from 'react'
import { TimelineShimmer } from '@components/Shimmer'
import { useDevice } from 'hooks/useDevice'
import { AppPanelLayoutSkeleton } from 'routes/layouts/AppPanelLayoutSkeleton'

export const AppSkeletonView = () => {
    const { isTouch } = useDevice()
    return isTouch ? <TimelineShimmer /> : <AppPanelLayoutSkeleton />
}
