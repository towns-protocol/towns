import React from 'react'
import { TouchHomeSkeleton } from 'routes/layouts/TouchHomeSkeleton'
import { useDevice } from 'hooks/useDevice'
import { AppPanelLayoutSkeleton } from 'routes/layouts/AppPanelLayoutSkeleton'

export const AppSkeletonView = () => {
    const { isTouch } = useDevice()
    return isTouch ? <TouchHomeSkeleton /> : <AppPanelLayoutSkeleton />
}
