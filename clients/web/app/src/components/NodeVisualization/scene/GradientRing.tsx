import { Line, LineProps } from '@react-three/drei'
import { Object3DProps, useFrame } from '@react-three/fiber'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Line2, LineSegments2 } from 'three-stdlib'
import { Color, Object3D } from 'three'
import { NodeData } from './utils/types'

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

    const [sortedColors] = useState(() => nodes.map((n) => new Color(n.color)))

    const positionFromOffset = useCallback(
        (angle: number) => {
            const debugPoints = false
            return (
                debugPoints
                    ? // draws a straight line
                      [angle * 4 - 2, 1, 2]
                    : // circle
                      [
                          Math.cos(angle * Math.PI * 2) * radius,
                          Math.sin(angle * Math.PI * 2) * radius,
                          0,
                      ]
            ) as [number, number, number]
        },
        [radius],
    )

    const nodePositions = useMemo<NodeRef[]>(
        () =>
            nodes.map((node, index, arr) => ({
                index,
                speed: 0.01,
                interpolatedSpeed: 0,
                position: (1 / arr.length) * index,
                offset: (1 / arr.length) * index,
                destOffset: (1 / arr.length) * index + Math.random() * 0.05,
            })),
        [nodes],
    )

    positions.node = connectedNode ? nodePositions[connectedNode.index].el ?? undefined : undefined

    const updateAnimation = useCallback(() => {
        nodePositions.forEach((node) => {
            node.interpolatedSpeed += (node.speed - node.interpolatedSpeed) * 0.01
            node.offset += (node.destOffset - node.offset) * node.speed
            node.el?.position.set(...positionFromOffset(node.offset % 1))
            const isInit = !!node.destOffset
            if (Math.random() < (!isInit ? 0.02 : 0.01)) {
                if (node.destOffset) {
                    node.speed = 0.01 * (Math.random() * 0.2)
                }
                node.destOffset = node.position + Math.random() * 0.07
            }
        })

        const g = gradientRef.current as null | LineProps | Line2 | LineSegments2

        if (g?.geometry) {
            const sortedNodes = nodePositions.slice().sort((a, b) => a.offset - b.offset)

            sortedNodes.forEach((n, i) => {
                sortedColors[i].lerp(nodes[n.index].color, 0.1)
            })

            const vertexColors = Array.from({ length: numPoints }).map((_, i) => {
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

                return new Color(c1).lerp(c2, l)
            })

            const cValues = vertexColors.map((c) => (c instanceof Color ? c.toArray() : c))

            g.geometry.setColors(cValues.flat(), 3)
        }
    }, [nodePositions, nodes, positionFromOffset, sortedColors])

    useFrame((a, d) => {
        if (!animating) {
            return
        }
        updateAnimation()
        if (ref.current) {
            ref.current.rotation.z += d * 0.01
            ref.current.rotation.x = Math.cos(0.0001 * Date.now() * Math.PI) * 0.1
            ref.current.rotation.y = Math.sin(0.0001 * Date.now() * Math.PI) * 0.1
        }
    })

    useEffect(() => {
        updateAnimation()
    }, [updateAnimation])

    const [[linePoints, vertexColors]] = useState(
        () =>
            [
                Array.from({ length: numPoints }).map((_, i) =>
                    positionFromOffset(i / (numPoints - 1)),
                ),
                Array.from({ length: numPoints }).map((_, i) => new Color(0xffffff)),
            ] as const,
    )

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

    return (
        <object3D {...restProps} ref={ref}>
            <Line points={linePoints} lineWidth={1} vertexColors={vertexColors} ref={gradientRef} />
            {nodes.map((node, i) => {
                const n = nodePositions[i]
                return n ? (
                    <CircleNode
                        key={node.id}
                        node={node}
                        nodePosition={n}
                        onHover={onNodeHover}
                        onLeave={onNodeLeave}
                    />
                ) : null
            })}
        </object3D>
    )
}

const CircleNode = (props: {
    node: NodeData
    nodePosition: NodeRef
    onHover: (node: NodeData) => void
    onLeave: (node: NodeData) => void
}) => {
    const { node, nodePosition } = props

    return (
        <object3D
            ref={(e) => (nodePosition.el = e)}
            key={node.id}
            onPointerEnter={(e) => {
                props.onHover(node)
            }}
            onPointerLeave={(e) => props.onLeave(node)}
        >
            <pointLight color={node.color} intensity={1} />
            <mesh>
                <sphereGeometry args={[0.08 * 3, 4, 2]} />
                <meshBasicMaterial visible={false} />
            </mesh>
            <mesh>
                <sphereGeometry args={[0.08 * 1.5, 4, 2]} />
                <meshBasicMaterial visible depthTest={false} color={0x252525} />
            </mesh>
            <mesh>
                <sphereGeometry args={[0.08 * 1, 4, 2]} />
                <meshBasicMaterial color={node.color} />
            </mesh>
        </object3D>
    )
}
