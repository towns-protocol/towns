import React from 'react'
import { TouchHomeSkeleton } from 'routes/layouts/TouchHomeSkeleton'
import { useDevice } from 'hooks/useDevice'
import { AppPanelLayoutSkeleton } from 'routes/layouts/AppPanelLayoutSkeleton'

export const AppSkeletonView = (props: {
    includeTopBar?: boolean
    includeLeftSidebar?: boolean
}) => {
    const { includeTopBar = true, includeLeftSidebar = true } = props
    const { isTouch } = useDevice()
    return isTouch ? (
        <TouchHomeSkeleton />
    ) : (
        <AppPanelLayoutSkeleton
            includeTopBar={includeTopBar}
            includeLeftSidebar={includeLeftSidebar}
        />
    )
}
