import React, { Suspense } from 'react'
import { Box } from '@ui'

type Props = {
    children?: React.ReactNode
}

export const PotentiallyUnusedSuspenseLoader = (props: Props) => (
    <Suspense fallback={<Fallback />}>{props.children}</Suspense>
)

// making this flash blue in order to figure if we actually need it and where it
// appears
const Fallback = () => <Box absoluteFill centerContent background="accent" />
