import React, { useCallback, useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { AnimatePresence } from 'framer-motion'
import { debug } from 'debug'
import { Box, Button, Card, Paragraph } from '@ui'
import { FadeInBox } from '@components/Transitions'
import { Spinner } from '@components/Spinner'
import { env } from 'utils'

const UPDATE_STARTUP_MS = 10 * 1000
const UPDATE_INTERVAL_MS = 5 * 60 * 1000

const log = debug('app:ReloadPrompt')

export const ReloadPrompt = () => {
    useAddDevOnlyHelpersToWindow()

    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, r) {
            log('registered:' + r)
            if (import.meta.env.DEV) {
                console.log('sw: dev - skipping updater')
                if (env.VITE_PUSH_NOTIFICATION_ENABLED) {
                    // doesn't seem to update the service worker in dev mode without this
                    updateServiceWorker(true)
                }
                return
            }
            if (r) {
                const checkInterval = () => {
                    log('checking for updates...')
                    if (!(!r.installing && navigator)) {
                        log('already installing')
                        return
                    }
                    if ('connection' in navigator && !navigator.onLine) {
                        return
                    }
                    const asyncUpdate = async () => {
                        const resp = await fetch(swUrl, {
                            cache: 'no-store',
                            headers: {
                                cache: 'no-store',
                                'cache-control': 'no-cache',
                            },
                        })
                        if (resp?.status === 200) {
                            log('status 200, updating...')
                            await r.update()
                        }
                    }
                    asyncUpdate()
                }
                setInterval(checkInterval, UPDATE_INTERVAL_MS)
                setTimeout(checkInterval, UPDATE_STARTUP_MS)
            }
        },

        onNeedRefresh() {
            log('need update...')
        },

        onOfflineReady() {
            log('offline ready...', offlineReady)
        },

        onRegisterError(error) {
            log('registration error', error)
        },
    })

    const close = () => {
        setOfflineReady(false)
        setNeedRefresh(false)
    }

    const [isVersionHidden, setIsVersionHidden] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    useEffect(() => {
        const timeout = setTimeout(() => {
            setIsVersionHidden(true)
        }, 3000)
        return () => {
            clearTimeout(timeout)
        }
    }, [])

    const onUpdateClick = useCallback(() => {
        setIsUpdating(true)
        const asyncUpdate = async () => {
            if (isUpdating) {
                return
            }
            // for safety, currently some of our URLs only work in SPA mode but
            // fail upon hard-refresh because of invalid chars
            const isCleanUrl = window.location.href.match(/\/$/)
            if (!isCleanUrl) {
                window.location.replace(`${window.location.href}${isCleanUrl ? '' : '/'}`)
            }
            // triggers update and immediate reload
            await updateServiceWorker(true)
        }
        asyncUpdate()
    }, [isUpdating, updateServiceWorker])

    return (
        <Box
            padding="lg"
            position="fixed"
            bottom="none"
            right="none"
            zIndex="uiAbove"
            color="gray1"
            pointerEvents="none"
        >
            <AnimatePresence>
                {needRefresh ? (
                    <FadeInBox layout preset="fadeup">
                        <Card
                            border
                            centerContent
                            padding="lg"
                            gap="lg"
                            borderRadius="sm"
                            pointerEvents="auto"
                        >
                            {!isUpdating ? (
                                <>
                                    <Box maxWidth="250">
                                        <Paragraph>
                                            A new version of the app is available.
                                        </Paragraph>
                                    </Box>
                                    <Box gap horizontal alignSelf="center">
                                        <Button
                                            size="button_sm"
                                            tone="cta1"
                                            onClick={onUpdateClick}
                                        >
                                            Update
                                        </Button>

                                        <Button size="button_sm" onClick={() => close()}>
                                            Dismiss
                                        </Button>
                                    </Box>
                                </>
                            ) : (
                                <FadeInBox horizontal centerContent gap layout="position">
                                    <Paragraph>Updating</Paragraph>
                                    <Spinner height="x2" />
                                </FadeInBox>
                            )}
                        </Card>
                    </FadeInBox>
                ) : !isVersionHidden ? (
                    <FadeInBox padding borderRadius="md" background="level1" rounded="sm">
                        <Paragraph>
                            version {APP_VERSION} ({APP_COMMIT_HASH})
                        </Paragraph>
                    </FadeInBox>
                ) : (
                    <></>
                )}
            </AnimatePresence>
        </Box>
    )
}

function useAddDevOnlyHelpersToWindow() {
    useEffect(() => {
        if (env.IS_DEV) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            window.clearAllWorkers = () => {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    for (const registration of registrations) {
                        registration.unregister()
                    }
                })
            }
        }
    }, [])
}
