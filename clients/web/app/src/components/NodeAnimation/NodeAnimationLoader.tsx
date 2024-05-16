import React, { Suspense } from 'react'
import { Box, BoxProps } from '@ui'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'
import { NodeAnimationSceneProps } from './scene/NodeAnimationScene'

const NodeAnimationScene = React.lazy(() =>
    import('./scene/NodeAnimationScene').then((module) => ({
        default: module.NodeAnimationScene,
    })),
)

export const NodeAnimationLoader = (
    props: {
        skipPlaceholder?: boolean
        minWidth?: BoxProps['minWidth']
        maxWidth?: BoxProps['maxWidth']
    } & NodeAnimationSceneProps & { children?: React.ReactNode },
) => {
    const { skipPlaceholder, children, minWidth, maxWidth, ...sceneProps } = props
    const boxProps = { minWidth, maxWidth }
    return (
        <Box aspectRatio="1/1" position="relative" width="100%" {...boxProps}>
            <Suspense fallback={skipPlaceholder ? <></> : <LoadingPlaceholder />}>
                <NodeAnimationScene {...sceneProps} />
            </Suspense>
            {children}
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
