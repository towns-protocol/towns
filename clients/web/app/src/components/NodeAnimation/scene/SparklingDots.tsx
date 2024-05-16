import React, { forwardRef, useMemo, useRef, useState } from 'react'
import { MeshBasicMaterial, Object3D } from 'three'
import { useFrame } from 'react-three-fiber'
import { NODE_COLORS } from '@components/NodeConnectionStatusPanel/hooks/useNodeData'
import { getPosition } from './utils/globeUtils'

type DotType = {
    id: string
    index: number
    color: string
    value: number
    xy: [number, number]
}

type Props = {
    dots: DotType[]
}

export const SparklingDots = (props: Props) => {
    const { dots } = props
    return dots.map((dot) => <Dot key={dot.id} dot={dot} />)
}

const Dot = forwardRef<Object3D, { dot: { index: number; color: string; xy: [number, number] } }>(
    (props, ref) => {
        const { dot } = props
        const [{ size, frequency }] = useState(() => ({
            size: Math.random() * 0.03 + 0.01,
            frequency: Math.random() * 100 + 250,
        }))

        const [color] = useState(() => NODE_COLORS[dot.index % NODE_COLORS.length])

        const position = useMemo(() => getPosition(dot.xy[0], dot.xy[1], 1.99), [dot.xy])
        const materialRef = useRef<MeshBasicMaterial>(null)
        useFrame(() => {
            const material = materialRef.current
            if (material) {
                material.opacity = Math.sin(dot.index * 0.33 + Date.now() / frequency) * 0.4 + 0.6
            }
        })

        return (
            <object3D position={position} ref={ref}>
                <mesh>
                    <sphereGeometry args={[size, 10, 10]} />
                    <meshBasicMaterial transparent color={color} opacity={1} ref={materialRef} />
                </mesh>
            </object3D>
        )
    },
)
