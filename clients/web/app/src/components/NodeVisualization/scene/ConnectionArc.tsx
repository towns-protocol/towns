import { Line, Ring } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import React, { useState } from 'react'
import { ColorRepresentation, Object3D, Vector3 } from 'three'

export const ConnectionArc = (props: {
    positions?: { [key: string]: Object3D | undefined }
    color: ColorRepresentation
}) => {
    const { positions, color = 0xffff00 } = props

    const numPoints = 60
    const [points, setPoints] = useState(() =>
        Array.from({ length: numPoints }).map(() => new Vector3()),
    )

    const o1 = positions?.node
    const o2 = positions?.dot

    useFrame(() => {
        if (!o1 || !o2) {
            console.log(o1, o2)
            return
        }

        const p1 = new Vector3()
        o1.getWorldPosition(p1)

        const p2 = new Vector3()
        o2.getWorldPosition(p2)

        const points: Vector3[] = []
        for (let i = 0, len = 60; i <= len; i++) {
            const p = new Vector3().lerpVectors(p1, p2, i / len)
            const d = p1.distanceTo(p2) * 0.15
            p.multiplyScalar(1 + d * Math.sin((Math.PI * i) / len))
            points.push(p)
        }

        // TODO: should not be on state but via ref
        setPoints(points)
    })

    if (!o1 || !o2) {
        return
    }

    const p1 = new Vector3()
    o1.getWorldPosition(p1)

    const p2 = new Vector3()
    o2.getWorldPosition(p2)

    return (
        <>
            {points.length > 0 ? (
                <Line
                    dashed
                    transparent
                    color={color}
                    opacity={p2.z > 0 || p1.z > 0 ? 0.8 : 0.2}
                    points={points}
                    lineWidth={1}
                    dashScale={20}
                    depthTest={false}
                />
            ) : (
                <></>
            )}
            <Ring args={[0.08, 0.09, 32]} position={p2} rotation={[0, 0, Math.PI / 2]}>
                <meshBasicMaterial
                    transparent
                    color={color}
                    depthTest={false}
                    opacity={p2.z > 0 ? 0.8 : 0.2}
                />
            </Ring>
            <Ring args={[0.02, 0.03, 32]} position={p2} rotation={[0, 0, Math.PI / 2]}>
                <meshBasicMaterial color={color} />
            </Ring>
        </>
    )
}
