import React, { Suspense } from 'react'

import { Box } from '@ui'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'

const NodeStatusAnimation = React.lazy(() =>
    import('./scene/NodeAnimationScene').then((module) => ({
        default: module.NodeAnimationScene,
    })),
)

export const NodeAnimationLoader = () => {
    return (
        <Box width="100%" aspectRatio="1/1" position="relative" maxWidth="300">
            <Suspense fallback={<LoadingPlaceholder />}>
                <NodeStatusAnimation />
            </Suspense>
        </Box>
    )
}

const LoadingPlaceholder = () => {
    return (
        <Box centerContent width="100%" height="100%">
            <Box
                background="level2"
                width="200"
                height="200"
                rounded="full"
                className={shimmerClass}
            />
        </Box>
    )
}
