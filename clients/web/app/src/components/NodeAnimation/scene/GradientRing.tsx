import { Billboard, Line, LineProps, RoundedBox } from '@react-three/drei'
import { Object3DProps, useFrame } from '@react-three/fiber'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Line2, LineSegments2 } from 'three-stdlib'
import { Color, Object3D, Vector3 } from 'three'
import { NodeData } from '@components/NodeConnectionStatusPanel/hooks/useNodeData'

type Props = {
    nodes: NodeData[]
    radius: number
    animating: boolean
    onNodeHover: (node: NodeData | null) => void
    positions: { [key: string]: Object3D | undefined }
    connectedNode?: NodeData
} & Object3DProps

type NodeRef = {
    index: number
    position: number
    offset: number
    destOffset: number
    speed: number
    interpolatedSpeed: number
    el?: Object3D | null
}

export const GradientRing = (props: Props) => {
    const { animating, positions, nodes, radius = 2.5, connectedNode, ...restProps } = props

    const ref = useRef<Object3D>(null)
    const gradientRef = useRef(null)
    const numPoints = 100

    const positionFromOffset = useCallback(
        (angle: number, dest: Vector3) => {
            return dest.set(
                Math.cos(angle * Math.PI * 2) * radius,
                Math.sin(angle * Math.PI * 2) * radius,
                0,
            )
        },
        [radius],
    )

    const [{ linePoints, vertexColors, bufferColors }] = useState(
        () =>
            ({
                linePoints: Array.from({ length: numPoints }).map((_, i) =>
                    positionFromOffset(i / (numPoints - 1), new Vector3()),
                ),
                vertexColors: Array.from({ length: numPoints }).map((_, i) => new Color(0xffffff)),
                bufferColors: Array.from({ length: numPoints * 3 }).map((_, i) => 0),
            } as const),
    )

    const sortedColors = useMemo(() => nodes.map((n) => new Color(n.color)), [nodes])

    const [nodePositions, setNodePositions] = useState<NodeRef[]>(() =>
        nodes.map((node, index, arr) => ({
            index,
            speed: Math.random() * 0.01 + 0.002,
            interpolatedSpeed: 0,
            position: (1 / arr.length) * index,
            offset: (1 / arr.length) * index,
            destOffset: 0,
        })),
    )

    useEffect(() => {
        setNodePositions((prev) =>
            nodes.map((node, index, arr) => {
                return (
                    prev[index] ?? {
                        index: node.index,
                        speed: Math.random() * 0.01 + 0.002,
                        interpolatedSpeed: 0,
                        position: (1 / arr.length) * index,
                        offset: (1 / arr.length) * index,
                        destOffset: 0,
                    }
                )
            }),
        )
    }, [nodes])

    const connectedNodeIndex = nodes.findIndex((n) => n.index === connectedNode?.index)
    positions.node = connectedNode ? nodePositions[connectedNodeIndex]?.el ?? undefined : undefined

    const prevDelta = useRef(0)
    const prevDate = useRef(Date.now())

    const updateAnimation = useCallback(() => {
        const dn = Date.now()
        prevDelta.current += dn - prevDate.current
        prevDate.current = dn

        const r = prevDelta.current > 1000
        const sp = 0.001 + Math.random() * 0.004

        if (r) {
            prevDelta.current = 0
        }
        const dof = ((Math.random() * 1) / nodePositions.length) * 0.8

        nodePositions.forEach((node, i) => {
            node.offset += (node.position + node.destOffset - node.offset) * node.speed
            if (node.el?.position) {
                positionFromOffset(node.offset % 1, node.el.position)
            }
            if (r && Math.random() < 0.25) {
                node.destOffset = dof
                node.speed = sp
            }
        })

        const g = gradientRef.current as null | LineProps | Line2 | LineSegments2

        if (g?.geometry && nodePositions.length) {
            const sortedNodes = nodePositions
                .map((n) => ({ ...n, offset: n.offset % 1 }))
                .sort((a, b) => a.offset - b.offset)

            sortedNodes.forEach((n, i) => {
                sortedColors[i].lerp(nodes[n.index].color, 0.1)
            })

            vertexColors.map((c, i) => {
                let i1 = sortedNodes.findIndex((n) => n.offset >= i / numPoints) - 1
                i1 = i1 < 0 ? sortedNodes.length - 1 : i1

                const i2 = (i1 + 1) % sortedNodes.length

                const c1 = sortedColors[i1]
                const c2 = sortedColors[i2]

                const o1 = sortedNodes[i1].offset
                const o2 = sortedNodes[i2].offset

                const t = o2 > o1 ? o2 - o1 : 1 + o2 - o1
                const a = i / numPoints
                const b = sortedNodes[i1].offset
                const l = (a >= b ? a - b : 1 + a - b) / t

                return c.copy(c1).lerp(c2, l)
            })

            vertexColors.forEach((c, i) => {
                bufferColors[i * 3] = c.r
                bufferColors[i * 3 + 1] = c.g
                bufferColors[i * 3 + 2] = c.b
            })

            g.geometry.setColors(bufferColors, 3)
        }
    }, [bufferColors, nodePositions, nodes, positionFromOffset, sortedColors, vertexColors])

    useFrame((a, d) => {
        if (!animating) {
            return
        }
        updateAnimation()
        if (ref.current) {
            ref.current.rotation.z -= d * 0.033
            ref.current.rotation.x = Math.cos(0.00015 * Date.now() * Math.PI) * 0.075
            ref.current.rotation.y = Math.sin(0.00015 * Date.now() * Math.PI) * 0.075
        }
    })

    useEffect(() => {
        updateAnimation()
    }, [updateAnimation])

    const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null)

    useEffect(() => {
        props.onNodeHover(hoveredNode)
    }, [hoveredNode, props])

    const onNodeHover = useCallback((node: NodeData) => {
        setHoveredNode(node)
    }, [])

    const onNodeLeave = useCallback((node: NodeData) => {
        setHoveredNode((n) => (n === node ? null : n))
    }, [])

    return nodes.length ? (
        <object3D {...restProps} ref={ref}>
            <group>
                <Line
                    points={linePoints}
                    lineWidth={1}
                    vertexColors={vertexColors}
                    ref={gradientRef}
                />
            </group>
            <group>
                {nodes.map((node, i) =>
                    nodePositions[i] ? (
                        <CircleNode
                            key={node.id}
                            node={node}
                            nodePosition={nodePositions[i]}
                            selected={node === connectedNode}
                            onHover={onNodeHover}
                            onLeave={onNodeLeave}
                        />
                    ) : null,
                )}
            </group>
        </object3D>
    ) : (
        <></>
    )
}

const CircleNode = (props: {
    node: NodeData
    nodePosition: NodeRef
    onHover: (node: NodeData) => void
    onLeave: (node: NodeData) => void
    selected?: boolean
}) => {
    const { node, nodePosition } = props

    const onPointerEnter = useCallback(() => {
        props.onHover(node)
    }, [node, props])

    const onPointerLeave = useCallback(() => {
        props.onLeave(node)
    }, [node, props])

    return (
        <object3D
            ref={(e) => {
                nodePosition.el = e
            }}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
        >
            <pointLight color={node.color} intensity={1} />

            <mesh>
                <sphereGeometry args={[0.08 * 3, 4]} />
                <meshBasicMaterial visible={false} />
            </mesh>

            <Billboard>
                {props.selected && (
                    <RoundedBox
                        args={[0.1, 0.1, 0.05]}
                        radius={0.03}
                        rotation-z={Math.PI / 4}
                        bevelSegments={2}
                    >
                        <meshPhongMaterial
                            transparent
                            color={node.color}
                            opacity={0.5}
                            depthTest={false}
                        />
                    </RoundedBox>
                )}
                <RoundedBox
                    args={[0.15, 0.15, 0.05]}
                    radius={0.03}
                    rotation-z={Math.PI / 4}
                    bevelSegments={2}
                >
                    <meshBasicMaterial color={node.color} />
                </RoundedBox>
            </Billboard>
        </object3D>
    )
}
