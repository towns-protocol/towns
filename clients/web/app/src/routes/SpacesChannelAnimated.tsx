import { AnimatePresence } from 'framer-motion'
import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import { ZLayerBox } from '@components/ZLayer/ZLayerContext'
import { transitions } from 'ui/transitions/transitions'
import { useCreateLink } from 'hooks/useCreateLink'
import { SpacesChannel } from './SpacesChannel'

export const SpacesChannelAnimated = () => {
    const navigate = useNavigate()

    const [channelPresented, setChannelPresented] = useState(false)
    useEffect(() => {
        setChannelPresented(true)
    }, [])

    const [search] = useSearchParams()
    const { createLink } = useCreateLink()

    const closePanel = useCallback(() => {
        setChannelPresented(false)

        setTimeout(() => {
            const ref = search.get('ref')
            if (ref === 'home') {
                const link = createLink({ route: 'townHome' })
                if (link) {
                    navigate(link)
                }
            } else if (ref) {
                // if panel has been referred from another place in the app, go back
                // to that place rather than parent. (e.g. from profile panel)
                navigate(-1)
            } else {
                navigate('../')
            }
        }, transitions.panelAnimationDuration * 1000)
    }, [createLink, navigate, search])

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
