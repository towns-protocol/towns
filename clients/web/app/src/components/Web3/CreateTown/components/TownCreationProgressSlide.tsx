import { AnimatePresence } from 'framer-motion'
import React, { useEffect, useMemo, useState } from 'react'
import { CreateSpaceFlowStatus } from 'use-towns-client'
import { SECOND_MS } from 'data/constants'
import { SetupChecklist } from '@components/SetupAnimation/SetupChecklist'
import {
    DEFAULT_CONFIG,
    NodeAnimationContext,
} from '@components/NodeAnimation/NodeAnimationContext'
import { NodeAnimationLoader } from '@components/NodeAnimation/NodeAnimationLoader'
import { useStore } from 'store/store'
import { Figma } from 'ui/styles/palette'
import { useDummyNodes } from '@components/SetupAnimation/hooks/useDummyNodes'
import { Box, Icon, Paragraph } from '@ui'
import { SlideLayout } from './SlideLayout'

export const TownCreationProgressSlide = (props: {
    status?: CreateSpaceFlowStatus
    isTransacting: boolean
}) => {
    const { isTransacting, status } = props

    const [showOverlay, setShowOverlay] = useState(() => isTransacting)

    useEffect(() => {
        if (!isTransacting) {
            const timeout = setTimeout(() => {
                setShowOverlay(false)
            }, SECOND_MS * 0.5)
            return () => {
                clearTimeout(timeout)
            }
        } else {
            setShowOverlay(true)
        }
    }, [isTransacting])

    useEffect(() => {
        console.log('[createFlowStatus]', isTransacting, status)
    }, [isTransacting, status])

    const steps = useMemo(
        () => ['Creating town onchain', 'Connecting to Towns Network', 'Setting up your town'],
        [],
    )
    const step = useMemo(() => {
        switch (status) {
            default:
            case CreateSpaceFlowStatus.MintingSpace:
                return 0
            case CreateSpaceFlowStatus.CreatingSpace:
                return 1
            case CreateSpaceFlowStatus.CreatingChannel:
            case CreateSpaceFlowStatus.CreatingUser:
                return 2
        }
    }, [status])

    //

    const darkMode = useStore((state) => state.getTheme() === 'dark')
    const dummyNodes = useDummyNodes({ grayScale: true })
    const nodeUrl = dummyNodes[1].nodeUrl
    const backgroundColorString = useMemo(
        () => (darkMode ? Figma.DarkMode.Level2 : Figma.LightMode.Level2),
        [darkMode],
    )

    const config = useMemo(
        () => ({
            ...DEFAULT_CONFIG,
            nodeUrl,
            darkMode,
            backgroundColorString,
            nodeConnections: dummyNodes,
        }),
        [backgroundColorString, darkMode, dummyNodes, nodeUrl],
    )

    return (
        <AnimatePresence>
            {showOverlay ? (
                <SlideLayout
                    title="Creating your town..."
                    background="level1"
                    renderLeft={
                        <Box centerContent position="relative" height="100%">
                            <NodeAnimationContext.Provider value={config}>
                                <NodeAnimationLoader
                                    skipPlaceholder
                                    showSparklingDots
                                    maxWidth="250"
                                />
                            </NodeAnimationContext.Provider>
                        </Box>
                    }
                >
                    <Box insetLeft="sm">
                        <SetupChecklist steps={steps} step={step} />
                    </Box>
                    <Disclaimer />
                </SlideLayout>
            ) : null}
        </AnimatePresence>
    )
}

export const Disclaimer = () => (
    <Box horizontal gap padding background="level2" rounded="sm" width="300" color="gray2">
        <Box centerContent>
            <Icon type="alert" size="square_sm" />
        </Box>
        <Box grow justifyContent="center">
            <Paragraph>Give it a moment. Building a town takes a village.</Paragraph>
        </Box>
    </Box>
)
