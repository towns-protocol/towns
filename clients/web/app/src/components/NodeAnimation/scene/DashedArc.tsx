import { Billboard, Line, Ring } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import React, { useRef, useState } from 'react'
import { ColorRepresentation, Group, Object3D, Vector3 } from 'three'
import { Line2 } from 'three-stdlib'
import { notUndefined } from 'ui/utils/utils'
import { slerp } from './utils/globeUtils'

export const DashedArc = (props: {
    positions?: { [key: string]: Object3D | undefined }
    color: ColorRepresentation
}) => {
    const { positions, color = 0xffff00 } = props
    const numPoints = 60

    const [{ points, p1, p2 }] = useState(
        () =>
            ({
                points: Array.from({ length: numPoints + 1 }).map(() => new Vector3()),
                p1: new Vector3(),
                p2: new Vector3(),
            } as const),
    )

    const lineTransparentRef = useRef<Line2>(null)
    const lineOpaqueRef = useRef<Line2>(null)
    const ringRef = useRef<Group>(null)

    const o1 = positions?.node
    const o2 = positions?.dot

    const lines = [lineOpaqueRef.current, lineTransparentRef.current].filter(notUndefined)

    useFrame(() => {
        if (!o1 || !o2) {
            return
        }

        o1.getWorldPosition(p1)
        o2.getWorldPosition(p2)

        if (ringRef.current) {
            ringRef.current.position.set(p2.x, p2.y, p2.z)
        }

        for (let i = 0, len = numPoints, t = 0; i < points.length; i++, t = i / len) {
            slerp(p1, p2, t, points[i]).multiplyScalar(2.5 - (2.5 - 2) * t)
        }

        lines.forEach((l) => {
            if (l) {
                l.geometry.setPositions(points.flatMap((p) => p.toArray()))
                l.computeLineDistances()
            }
        })
    })

    if (!o1 || !o2) {
        return <></>
    }

    return (
        <>
            <Line
                dashed
                transparent
                color={color}
                opacity={0.25}
                points={points}
                lineWidth={1}
                dashScale={20}
                depthTest={false}
                ref={lineTransparentRef}
            />
            <Line
                dashed
                transparent
                color={color}
                points={points}
                lineWidth={1}
                dashScale={20}
                ref={lineOpaqueRef}
            />

            <group>
                <Billboard ref={ringRef}>
                    <Ring args={[0.08, 0.1, 16]}>
                        <meshBasicMaterial
                            transparent
                            depthTest={false}
                            color={color}
                            opacity={0.66}
                        />
                    </Ring>
                    <Ring args={[0, 0.04, 8]}>
                        <meshBasicMaterial
                            transparent
                            color={color}
                            depthTest={false}
                            opacity={0.66}
                        />
                    </Ring>
                    <Ring args={[0, 0.04, 8]}>
                        <meshBasicMaterial transparent color={color} />
                    </Ring>
                </Billboard>
            </group>
        </>
    )
}
