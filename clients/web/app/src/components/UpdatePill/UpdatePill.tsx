import React, { useCallback, useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { AnimatePresence } from 'framer-motion'
import { debug } from 'debug'
import { Box, FancyButton } from '@ui'
import { FadeInBox } from '@components/Transitions'
import { SECOND_MS } from 'data/constants'
import { clearAllWorkers } from 'hooks/usePeriodicUpdates'
import { env } from 'utils'
import { useUpdatePillStateStore } from './useUpdatePillStateStore'

const log = debug('app:UpdatePill')
log.enabled = true

export const UpdatePill = () => {
    if (env.VITE_ENABLE_MSW_BROWSER) {
        return null
    }

    return <UpdatePillChild />
}

const UpdatePillChild = () => {
    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW()

    const setIsUpdatePillDisplaying = useUpdatePillStateStore((s) => s.setIsUpdatePillDisplaying)

    useEffect(() => {
        setIsUpdatePillDisplaying(needRefresh)
    }, [needRefresh, setIsUpdatePillDisplaying])

    const [isUpdating, setIsUpdating] = useState(false)

    const onUpdateClick = useCallback(() => {
        const asyncUpdate = async () => {
            // start a timer to clear all workers and force a reload if the vite-pwa update somehow fails
            // we're not clearing this timeout because this should only happen once
            // and updateServiceWorker() doesn't throw an error if it doesn't work, so we don't want to clear the timeout immediately
            setTimeout(async () => {
                log('update failed, clearing workers and reloading...')
                await clearAllWorkers()
                window.location.reload()
            }, SECOND_MS * 10)

            log('updateServiceWorker...')

            // triggers update and immediate reload
            try {
                await updateServiceWorker()
            } catch (error) {
                log('sw: update pill, error updating service worker', error)
            }

            log('updateServiceWorker complete')
        }

        if (isUpdating) {
            return
        }
        setIsUpdating(true)
        asyncUpdate()
    }, [isUpdating, updateServiceWorker])

    return (
        <Box
            padding="x4"
            position="fixed"
            bottom="none"
            right="none"
            left="none"
            zIndex="tooltipsAbove"
            color="gray1"
            pointerEvents="none"
        >
            <AnimatePresence mode="sync">
                <FadeInBox centerContent preset="fadeup" pointerEvents="auto" width="100%">
                    <Box>
                        {needRefresh ? (
                            <FancyButton
                                cta
                                compact
                                borderRadius="lg"
                                spinner={isUpdating}
                                boxShadow="card"
                                onClick={!isUpdating ? onUpdateClick : undefined}
                            >
                                {isUpdating ? 'Updating' : 'Update Towns'}
                            </FancyButton>
                        ) : null}
                    </Box>
                </FadeInBox>
            </AnimatePresence>
        </Box>
    )
}
