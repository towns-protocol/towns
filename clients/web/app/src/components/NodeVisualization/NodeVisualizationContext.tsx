import { createContext } from 'react'

export const DEFAULT_CONFIG = {
    center: { x: 150, y: 150 },
    radius: 110,
    animate: true as boolean,
    animateNodes: true as boolean,
    nodeUrl: '' as string | undefined,
} as const

export const NodeVisualizationContext = createContext(DEFAULT_CONFIG)
