import React, { useCallback, useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { AnimatePresence } from 'framer-motion'
import { debug } from 'debug'
import { Box, FancyButton } from '@ui'
import { FadeInBox } from '@components/Transitions'
import { SECOND_MS } from 'data/constants'
import { clearAllWorkers } from 'hooks/usePeriodicUpdates'
import { useDevice } from 'hooks/useDevice'

const log = debug('app:ReloadPrompt')
log.enabled = true

export const ReloadPrompt = () => {
    const { isTouch } = useDevice()
    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW()

    const [isUpdating, setIsUpdating] = useState(false)

    const onUpdateClick = useCallback(() => {
        const asyncUpdate = async () => {
            // start a timer to clear all workers and force a reload if the vite-pwa update somehow fails
            // we're not clearing this timeout because this should only happen once
            // and updateServiceWorker() doesn't throw an error if it doesn't work, so we don't want to clear the timeout immediately
            setTimeout(async () => {
                log('update failed, clearing workers and reloading...')
                console.warn(
                    '[ReloadPrompt][hnt-6051]',
                    'update failed, clearing workers and reloading...',
                    {
                        deviceType: isTouch ? 'mobile' : 'desktop',
                    },
                )
                await clearAllWorkers()
                console.warn(
                    '[ReloadPrompt][hnt-6051]',
                    'after clearing workers, window.location.reload',
                    {
                        location: window.location.href,
                        deviceType: isTouch ? 'mobile' : 'desktop',
                    },
                )
                window.location.reload()
            }, SECOND_MS * 10)

            // for safety, currently some of our URLs only work in SPA mode but
            // fail upon hard-refresh because of invalid chars
            const isCleanUrl = window.location.href.match(/\/$/)

            if (!isCleanUrl) {
                log('cleaning url...', window.location.href)
                const beforeCleanUrl = window.location.href
                window.location.replace(`${window.location.href}${isCleanUrl ? '' : '/'}`)
                console.warn('[ReloadPrompt][hnt-6051]', 'cleaning url', {
                    beforeCleanUrl,
                    afterCleanUrl: window.location.href,
                    deviceType: isTouch ? 'mobile' : 'desktop',
                })
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
    }, [isTouch, isUpdating, updateServiceWorker])

    useEffect(() => {
        // Reminder to remove: https://linear.app/hnt-labs/issue/HNT-6108/reminder-to-remove-consolewarn-for-hnt-6051
        console.warn('[ReloadPrompt][hnt-6051]', 'states', {
            isUpdating,
            needRefresh,
            deviceType: isTouch ? 'mobile' : 'desktop',
        })
    }, [isTouch, isUpdating, needRefresh])

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
