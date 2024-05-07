import React, { forwardRef, useMemo, useState } from 'react'
import { Object3D } from 'three'
import { getPosition } from './utils/globeUtils'

export const HomeDot = forwardRef<
    Object3D,
    { dot: { index: number; color: string; xy: [number, number] } }
>((props, ref) => {
    const { dot } = props
    const size = 0.01

    const [color] = useState(
        () => `hsla(${Math.random() * 30 + 185}, 20%, ${(Math.random() * 0.4 + 0.6) * 100}%, 1)`,
    )

    const position = useMemo(() => getPosition(dot.xy[0], dot.xy[1], 2.01), [dot.xy])

    return (
        <object3D position={position} ref={ref}>
            <mesh>
                <sphereGeometry args={[size, 10, 10]} />
                <meshBasicMaterial transparent color={color} opacity={1} />
            </mesh>
        </object3D>
    )
})
