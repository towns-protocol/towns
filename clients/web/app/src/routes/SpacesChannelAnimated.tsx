import React, { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence } from 'framer-motion'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { PATHS } from 'routes'
import { transitions } from 'ui/transitions/transitions'
import { MotionStack } from '@ui'
import { SpacesChannel } from './SpacesChannel'

export const SpacesChannelAnimated = () => {
    const spaceId = useSpaceIdFromPathname()
    const navigate = useNavigate()

    const [channelPresented, setChannelPresented] = useState(true)
    const closePanel = useCallback(() => {
        setChannelPresented(false)
        setTimeout(() => {
            const to = `/${PATHS.SPACES}/${spaceId}/`
            navigate(to)
        }, transitions.panelAnimationDuration * 1000)
    }, [setChannelPresented, navigate, spaceId])

    return (
        <AnimatePresence>
            {channelPresented && (
                <MotionStack
                    absoluteFill
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: '0%', opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={transitions.panel}
                    background="level1"
                    zIndex="tooltips"
                    overflowX="hidden"
                >
                    <SpacesChannel onTouchClose={closePanel} />
                </MotionStack>
            )}
        </AnimatePresence>
    )
}
