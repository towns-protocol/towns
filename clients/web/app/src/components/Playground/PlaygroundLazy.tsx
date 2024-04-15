import React from 'react'
const PlaygroundRoutes = React.lazy(() => import('@components/Playground/PlaygroundRoutes'))

export function PlaygroundLazy() {
    return <PlaygroundRoutes />
}
