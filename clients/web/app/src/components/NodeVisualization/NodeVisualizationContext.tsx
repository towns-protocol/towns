import { createContext } from 'react'

export const DEFAULT_CONFIG = {
    animate: true as boolean,
    animateNodes: true as boolean,
    center: { x: 150, y: 150 },
    darkMode: true as boolean,
    nodeUrl: '' as string | undefined,
    radius: 110,
} as const

export const NodeVisualizationContext = createContext(DEFAULT_CONFIG)
