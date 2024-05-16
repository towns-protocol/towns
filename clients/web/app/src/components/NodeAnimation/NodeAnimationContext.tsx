import { createContext } from 'react'
import { NodeData } from '@components/NodeConnectionStatusPanel/hooks/useNodeData'

export const DEFAULT_CONFIG = {
    animate: true as boolean,
    animateNodes: true as boolean,
    center: { x: 150, y: 150 },
    darkMode: true as boolean,
    nodeUrl: '' as string | undefined,
    radius: 110,
    backgroundColorString: '#000000' as string,
    nodeConnections: [] as NodeData[],
} as const

export const NodeAnimationContext = createContext(DEFAULT_CONFIG)
