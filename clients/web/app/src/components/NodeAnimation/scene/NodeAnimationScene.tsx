import { animated, useSpring } from '@react-spring/three'
import { PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useDrag } from 'react-use-gesture'
import { Color, Euler, Object3D } from 'three'
import seedrandom from 'seedrandom'
import { NodeData, useNodeData } from '../../NodeConnectionStatusPanel/hooks/useNodeData'
import { NodeAnimationContext } from '../NodeAnimationContext'
import { GradientRing } from './GradientRing'
import { HomeDot } from './HomeDot'
import { DashedArc } from './DashedArc'
import { useGlobeTexture } from './hooks/useGlobeTexture'
import { createNoise } from './utils/quickNoise'
import { NodeTooltips } from '../NodeTooltips'

export const NodeAnimationScene = () => {
    const [{ noise, mapSize }] = useState(() => ({
        noise: createNoise(seedrandom('towns2')),
        mapSize: [200, 100] as [number, number],
    }))

    const containerRef = useRef<HTMLCanvasElement>(null)

    const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null)

    const onNodeHover = useCallback((node: NodeData | null) => {
        setHoveredNode(node)
    }, [])

    const [hovered, setHovered] = useState(false)
    const onHover = useCallback((h: boolean) => {
        setHovered(h)
    }, [])

    return (
        <>
            <Canvas
                style={{ cursor: hovered ? 'grab' : hoveredNode ? 'pointer' : undefined }}
                ref={containerRef}
            >
                <GlobeScene
                    noise={noise}
                    mapSize={mapSize}
                    onNodeHover={onNodeHover}
                    onHover={onHover}
                />
            </Canvas>

            <NodeTooltips hoveredNode={hoveredNode} containerRef={containerRef} />
        </>
    )
}

const GlobeScene = (props: {
    noise: ReturnType<typeof createNoise>
    mapSize: [number, number]
    onNodeHover: (node: NodeData | null) => void
    onHover: (hovered: boolean) => void
}) => {
    const { nodeUrl } = useContext(NodeAnimationContext)
    const { mapSize, noise } = props
    const { canvas, homePoint, relevantPoints } = useGlobeTexture(noise, mapSize)
    const { darkMode } = useContext(NodeAnimationContext)

    const globeRef = useRef<Object3D>(null)
    const nodeConnections = useNodeData(nodeUrl)

    const nodes = useMemo(() => {
        return nodeConnections.map((n, index) => ({
            ...n,
            color: new Color(n.color),
            offset: (1 / 3) * index + Math.random() * (0.9 / 3),
        }))
    }, [nodeConnections])

    const connectedNode = useMemo(() => {
        return nodes.find((n) => n.nodeUrl === nodeUrl)
    }, [nodeUrl, nodes])

    // debugger

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

    const bindDrag = useDrag(({ delta: [dx, dy], offset, active }) => {
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
    }, {})

    useFrame((state) => {
        state.camera.lookAt(0, 0, 0)
        if (globeRef.current) {
            globeRef.current.rotation.y += 0.001
        }
    })

    const onPointerEnter = useCallback(() => {
        props.onHover(true)
    }, [props])

    const onPointerLeave = useCallback(() => {
        props.onHover(false)
    }, [props])

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

            <ambientLight intensity={darkMode ? 0.45 : 2} />

            <directionalLight
                intensity={darkMode ? 2 : 2}
                position={[-10, 0, 5]}
                rotation={[-Math.PI, 0, 0]}
            />

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
                {...bindDrag()}
                rotation-y={worldSpring.rotationY}
                rotation-x={worldSpring.rotationX}
            >
                <object3D ref={globeRef} rotation-y={-0.1}>
                    {homePoint && (
                        <HomeDot
                            key="home"
                            dot={homePoint}
                            ref={(r) => {
                                positions.dot = r ?? undefined
                            }}
                        />
                    )}
                    {darkMode ? (
                        relevantPoints.map((dot) => <HomeDot key={dot.id} dot={dot} />)
                    ) : (
                        <></>
                    )}
                    <mesh onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
                        <sphereGeometry args={[2, 120, 60]} />
                        <meshPhysicalMaterial
                            roughness={darkMode ? 1 : 0.5}
                            transparent={!darkMode}
                        >
                            <canvasTexture attach="map" image={canvas} />
                        </meshPhysicalMaterial>
                    </mesh>
                </object3D>
            </animated.object3D>
            <DashedArc positions={positions} color={connectedNode?.color ?? 0xffffff} />
        </>
    )
}
