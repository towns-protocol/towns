import React, { Suspense, useState } from 'react'
import seedrandom from 'seedrandom'
import { Box } from '@ui'
import { createNoise } from './scene/utils/quickNoise'

const NodeStatusAnimation = React.lazy(() =>
    import('./scene/NodeStatusAnimation').then((module) => ({
        default: module.NodeStatusAnimation,
    })),
)

export const NodeVisualization = () => {
    const [{ noise, mapSize }] = useState(() => ({
        noise: createNoise(seedrandom('towns2')),
        mapSize: [200, 100] as [number, number],
    }))

    return (
        <Box width="100%" aspectRatio="1/1" position="relative" maxWidth="300">
            <Suspense fallback={<LoadingAnimation />}>
                <NodeStatusAnimation noise={noise} mapSize={mapSize} />
            </Suspense>
        </Box>
    )
}

const LoadingAnimation = () => {
    return <Box>Loading...</Box>
}
