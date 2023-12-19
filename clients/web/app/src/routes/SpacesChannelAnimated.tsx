import { AnimatePresence } from 'framer-motion'
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ZLayerBox } from '@components/ZLayer/ZLayerContext'
import { transitions } from 'ui/transitions/transitions'
import { SpacesChannel } from './SpacesChannel'

export const SpacesChannelAnimated = () => {
    const navigate = useNavigate()

    const [channelPresented, setChannelPresented] = useState(false)
    useEffect(() => {
        setChannelPresented(true)
    }, [])

    const closePanel = useCallback(() => {
        setChannelPresented(false)
        setTimeout(() => {
            // const to = `/${PATHS.SPACES}/${spaceId}/`
            navigate(-1)
        }, transitions.panelAnimationDuration * 1000)
    }, [setChannelPresented, navigate])

    return (
        <AnimatePresence>
            {channelPresented && (
                <ZLayerBox
                    absoluteFill
                    initial={{ x: '100%' }}
                    animate={{ x: '0%' }}
                    exit={{ x: '100%' }}
                    transition={transitions.panel}
                    background="level1"
                    overflowX="hidden"
                >
                    <SpacesChannel onTouchClose={closePanel} />
                </ZLayerBox>
            )}
        </AnimatePresence>
    )
}
