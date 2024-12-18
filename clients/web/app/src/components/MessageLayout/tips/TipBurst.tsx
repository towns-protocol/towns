import React, { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Box, Button, MotionBox } from '@ui'

const DEBUG = false
// Timing
const BURST_INTERVAL = 500 // How often new icons are created (ms)
const ANIMATION_DURATION = 2 // How long each icon animates (seconds)
const DELAY_RANGE = 0.5 // Maximum random delay for each icon (seconds)

// Quantity
const MIN_ICONS_PER_BURST = 1
const MAX_ICONS_PER_BURST = 1
const MAX_CONCURRENT_ICONS = 5

// Movement
const FLOAT_DISTANCE = 150 // How far icons float up (pixels)
const SPREAD_RANGE = 50 // Maximum horizontal spread (pixels will be -20 to +20)
const FINAL_SCALE = 1 // How small icons become while floating

// Initial position randomization
const INITIAL_SPREAD_X = 10 // Initial random X spread (-10 to +10 pixels)
const INITIAL_SPREAD_Y = 10 // Initial random Y spread (-10 to +10 pixels)

const FADE_IN_DURATION = 0.2

interface FloatingIcon {
    id: number
    x: number
    initialX: number
    initialY: number
    delay: number
}

export function TipBurst({
    active = false,
    maxEmissions = 10,
}: {
    active?: boolean
    maxEmissions?: number
}) {
    const [floatingIcons, setFloatingIcons] = useState<FloatingIcon[]>([])
    const [totalEmissions, setTotalEmissions] = useState(0)
    const [isComplete, setIsComplete] = useState(false)

    const resetAnimation = () => {
        setFloatingIcons([])
        setTotalEmissions(0)
        setIsComplete(false)
    }

    useEffect(() => {
        if (active) {
            setIsComplete(false)
            setTotalEmissions(0)
        }
    }, [active])

    useEffect(() => {
        if (active && !isComplete) {
            const interval = setInterval(
                () => {
                    // Check if we've reached max emissions
                    if (totalEmissions >= maxEmissions) {
                        clearInterval(interval)
                        // Don't set isComplete here - wait for animations to finish
                        return
                    }

                    const numIcons =
                        Math.floor(
                            Math.random() * (MAX_ICONS_PER_BURST - MIN_ICONS_PER_BURST + 1),
                        ) + MIN_ICONS_PER_BURST

                    const remainingEmissions = maxEmissions - totalEmissions
                    const actualNumIcons = Math.min(numIcons, remainingEmissions)

                    const newIcons = Array.from({ length: actualNumIcons }, () => ({
                        id: Date.now() + Math.random(),
                        x: Math.random() * SPREAD_RANGE - SPREAD_RANGE / 2,
                        initialX: Math.random() * INITIAL_SPREAD_X - INITIAL_SPREAD_X / 2,
                        initialY: Math.random() * INITIAL_SPREAD_Y - INITIAL_SPREAD_Y / 2,
                        delay: totalEmissions === 0 ? 0 : Math.random() * DELAY_RANGE,
                    }))

                    setFloatingIcons((icons) =>
                        [...icons, ...newIcons].slice(-MAX_CONCURRENT_ICONS),
                    )
                    setTotalEmissions((prev) => prev + actualNumIcons)
                },
                totalEmissions === 0 ? 0 : BURST_INTERVAL,
            )

            return () => clearInterval(interval)
        }
    }, [active, totalEmissions, maxEmissions, isComplete])

    // Effect to check when all animations are complete
    useEffect(() => {
        if (totalEmissions >= maxEmissions && floatingIcons.length === 0) {
            setIsComplete(true)
        }
    }, [totalEmissions, maxEmissions, floatingIcons.length])

    return (
        <Box position="relative">
            {DEBUG && <Button onClick={resetAnimation}>reset</Button>}
            <AnimatePresence
                onExitComplete={() => {
                    // When an animation exits, check if we need to remove it from floatingIcons
                    if (totalEmissions >= maxEmissions) {
                        setFloatingIcons((current) => current.slice(1))
                    }
                }}
            >
                {floatingIcons.map(({ id, x, initialX, initialY, delay }) => (
                    <MotionBox
                        key={id}
                        initial={{
                            opacity: 0,
                            y: initialY,
                            x: initialX,
                            scale: 1,
                        }}
                        animate={{
                            opacity: [0, 1, 0],
                            y: [-initialY, -FLOAT_DISTANCE + initialY],
                            x: [initialX, x + initialX],
                            scale: [1, FINAL_SCALE],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                            duration: ANIMATION_DURATION,
                            times: [0, FADE_IN_DURATION, 1],
                            delay,
                            ease: 'easeOut',
                        }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            fontSize: '24px',
                        }}
                    >
                        💰
                    </MotionBox>
                ))}
            </AnimatePresence>
        </Box>
    )
}
