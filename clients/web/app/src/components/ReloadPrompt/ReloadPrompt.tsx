import React, { useCallback, useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { AnimatePresence } from 'framer-motion'
import { debug } from 'debug'
import { Box, FancyButton } from '@ui'
import { FadeInBox } from '@components/Transitions'
import { SECOND_MS } from 'data/constants'
import { clearAllWorkers } from 'hooks/usePeriodicUpdates'

const log = debug('app:ReloadPrompt')
log.enabled = true

export const ReloadPrompt = () => {
    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW()

    const [isVersionHidden, setIsVersionHidden] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    useEffect(() => {
        const timeout = setTimeout(() => {
            setIsVersionHidden(true)
        }, SECOND_MS * 5)
        return () => {
            clearTimeout(timeout)
        }
    }, [])

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

            // for safety, currently some of our URLs only work in SPA mode but
            // fail upon hard-refresh because of invalid chars
            const isCleanUrl = window.location.href.match(/\/$/)

            if (!isCleanUrl) {
                log('cleaning url...', window.location.href)
                window.location.replace(`${window.location.href}${isCleanUrl ? '' : '/'}`)
            }

            log('updateServiceWorker...')

            // triggers update and immediate reload
            try {
                await updateServiceWorker()
            } catch (error) {
                log('sw: reload prompt, error updating service worker', error)
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
            padding="lg"
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
                        {!isVersionHidden ? (
                            <FancyButton compact borderRadius="lg" boxShadow="card">
                                {APP_COMMIT_HASH}
                            </FancyButton>
                        ) : needRefresh ? (
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
