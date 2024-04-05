import { AnimatePresence } from 'framer-motion'
import React, { useEffect, useMemo, useState } from 'react'
import { Box, MotionBox, MotionStack, Stack } from '@ui'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'
import * as styles from './SpaceSideBar.css'

export const SpaceSidebarLoadingPlaceholder = () => (
    <>
        <Stack
            elevateReadability
            data-testid="channel-shimmer"
            position="relative"
            width="100%"
            height="100%"
            borderRadius="sm"
            overflow="hidden"
        >
            <Stack
                position="absolute"
                top="none"
                className={styles.gradientBackground}
                width="100%"
                height="200"
            />
            <Stack
                absoluteFill
                paddingY="x4"
                paddingX="sm"
                alignItems="center"
                justifyContent="start"
                gap="lg"
            >
                <Stack gap="lg" paddingTop="md">
                    <Box rounded="md" width="100" height="100" className={shimmerClass} />
                </Stack>{' '}
                <Box height="x2" width="150" className={shimmerClass} borderRadius="xs" />
                <Stack gap="sm" width="100%">
                    <Box
                        horizontal
                        grow
                        width="100%"
                        borderRadius="lg"
                        height="height_lg"
                        className={shimmerClass}
                    />
                    <Box
                        horizontal
                        grow
                        width="100%"
                        borderRadius="lg"
                        height="height_lg"
                        className={shimmerClass}
                    />
                </Stack>
                <Stack width="100%">
                    <SidebarLoadingAnimation />
                </Stack>
            </Stack>
        </Stack>
    </>
)

export const SidebarLoadingAnimation = () => {
    const [num, setNum] = useState(0)
    useEffect(() => {
        if (num > 7) {
            return
        }
        const timeout = setTimeout(
            () => {
                setNum((n) => n + 1)
            },
            num < 2 ? 1000 : num < 4 ? 3000 : 7500,
        )
        return () => clearTimeout(timeout)
    }, [num])
    const channels = useMemo(
        () =>
            Array(num)
                .fill(0)
                .map((_, i) => `${i}`),
        [num],
    )
    return (
        <AnimatePresence>
            {channels.map((c) => (
                <FakeChannel key={c} />
            ))}
        </AnimatePresence>
    )
}

const FakeChannel = () => {
    const [size] = useState(() => Math.random() * 0.4 + 0.6)
    return (
        <MotionStack
            horizontal
            gap
            initial={{ y: 5 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            paddingX="md"
            paddingY="md"
            alignItems="center"
            height="x7"
        >
            <MotionBox
                initial={{
                    scale: 0,
                }}
                animate={{
                    scale: 1,
                }}
                square="square_lg"
                background="level3"
                borderRadius="sm"
                className={shimmerClass}
            />
            <MotionBox
                grow
                height="x2"
                className={shimmerClass}
                borderRadius="xs"
                initial={{
                    originX: 0,
                    scaleX: 0,
                }}
                animate={{
                    scaleX: size,
                }}
                transition={{ delay: 0.5 }}
            />
            <MotionBox flexGrow="h3" />
        </MotionStack>
    )
}
