import { animated, useSpring } from '@react-spring/three'
import { PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useDrag } from 'react-use-gesture'
import { CanvasTexture, Color, Euler, Object3D } from 'three'
import { useStaticNodeData } from '../../NodeConnectionStatusPanel/hooks/useStaticNodeData'
import { NodeVisualizationContext } from '../NodeVisualizationContext'
import { GradientRing } from './GradientRing'
import { HomeDot } from './HomeDot'
import { ConnectionArc } from './ConnectionArc'
import { useGlobeTexture } from './hooks/useGlobeTexture'
import { createNoise } from './utils/quickNoise'
import { NodeData } from './utils/types'
import { NodeAnimationTooltips } from '../NodeAnimationTooltips'

export const NodeStatusAnimation = (props: {
    noise: ReturnType<typeof createNoise>
    mapSize: [number, number]
    width?: number
    height?: number
}) => {
    const { noise, mapSize } = props

    const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null)
    const onNodeHover = useCallback((node: NodeData | null) => {
        setHoveredNode(node)
    }, [])

    const ref = useRef<HTMLCanvasElement>(null)

    return (
        <>
            <Canvas style={{ cursor: hoveredNode ? 'pointer' : undefined }} ref={ref}>
                <GlobeScene noise={noise} mapSize={mapSize} onNodeHover={onNodeHover} />
            </Canvas>
            <NodeAnimationTooltips hoveredNode={hoveredNode} containerRef={ref} />
        </>
    )
}

const GlobeScene = (props: {
    noise: ReturnType<typeof createNoise>
    mapSize: [number, number]
    onNodeHover: (node: NodeData | null) => void
}) => {
    const { nodeUrl } = useContext(NodeVisualizationContext)
    const { mapSize, noise } = props
    const { canvas, homePoint, relevantPoints } = useGlobeTexture(noise, mapSize)

    const textureRef = useRef<CanvasTexture>(null)

    const nodeConnections = useStaticNodeData()

    const nodes = useMemo(() => {
        return nodeConnections.map((n, index) => ({
            index,
            ...n,
            color: new Color(n.color),
            offset: (1 / 3) * index + Math.random() * (0.9 / 3),
        }))
    }, [nodeConnections])

    const connectedNode = useMemo(() => {
        return nodes.find((n) => n.id === nodeUrl)
    }, [nodeUrl, nodes])

    const size = {
        width: 300,
        height: 300,
    }

    const [[worldRotation, cameraRotation]] = useState(() => [new Euler(), new Euler()])

    const [cameraSpring, setCameraSpring] = useSpring(() => ({
        x: 0,
        y: 0,
        z: 7,
    }))

    const [worldSpring, setWorldSpring] = useSpring(() => ({
        rotationX: 0,
        rotationY: 0,
        config: { mass: 1, tension: 200, friction: 40 },
    }))

    const bind = useDrag(({ delta: [dx, dy], offset, active }) => {
        if (active) {
            cameraRotation.x = Math.min(
                0.5,
                Math.max(-0.5, cameraRotation.x + (dx / size.width) * -1),
            )
            cameraRotation.y = Math.min(
                0.5,
                Math.max(-0.5, cameraRotation.y + (dy / size.width) * 1),
            )

            worldRotation.y += (dx / size.width) * 2
        } else {
            cameraRotation.x = 0
            cameraRotation.y = 0
            worldRotation.y = 0
        }

        setWorldSpring({
            rotationY: worldRotation.y,
        })

        setCameraSpring({
            x: Math.sin(cameraRotation.x) * 7,
            y: Math.sin(cameraRotation.y) * 7,
            z: Math.cos(cameraRotation.x) * Math.cos(cameraRotation.y) * 7,
            config: active
                ? { mass: 1, tension: 200, friction: 20 }
                : { mass: 1, tension: 40, friction: 20 },
        })
    })

    useFrame((state) => {
        state.camera.lookAt(0, 0, 0)
    })

    const [positions, setPositions] = useState<{ [key: string]: Object3D | undefined }>(() => ({
        node: undefined,
        dot: undefined,
    }))

    useEffect(() => {
        setPositions((prev) => ({ ...prev }))
    }, [])

    return (
        <>
            <animated.group
                position-x={cameraSpring.x}
                position-y={cameraSpring.y}
                position-z={cameraSpring.z}
            >
                <PerspectiveCamera makeDefault />
            </animated.group>
            <ambientLight intensity={0.5} />
            <directionalLight intensity={0.5} position={[10, 0, -10]} rotation={[-Math.PI, 0, 0]} />
            <directionalLight intensity={1} position={[-10, 0, 5]} rotation={[-Math.PI, 0, 0]} />
            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore */}

            <GradientRing
                animating
                nodes={nodes}
                radius={2.5}
                positions={positions}
                connectedNode={connectedNode}
                onNodeHover={props.onNodeHover}
            />
            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore */}
            <animated.object3D
                {...bind()}
                rotation-y={worldSpring.rotationY}
                rotation-x={worldSpring.rotationX}
            >
                {homePoint && (
                    <HomeDot
                        key="home"
                        dot={homePoint}
                        ref={(r) => {
                            positions.dot = r ?? undefined
                        }}
                    />
                )}
                {relevantPoints.map((dot) => (
                    <HomeDot key={dot.id} dot={dot} />
                ))}
                <mesh>
                    <sphereGeometry args={[2, 16, 32]} />
                    <meshPhysicalMaterial color="#fff" roughness={1}>
                        <canvasTexture ref={textureRef} attach="map" image={canvas} />
                    </meshPhysicalMaterial>
                </mesh>
            </animated.object3D>
            <ConnectionArc positions={positions} color={connectedNode?.color ?? 0xffffff} />
        </>
    )
}
