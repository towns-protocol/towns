import React, { useCallback, useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { AnimatePresence } from 'framer-motion'
import { debug } from 'debug'
import { Box, Button, Card, Paragraph } from '@ui'
import { FadeInBox } from '@components/Transitions'
import { Spinner } from '@components/Spinner'
import { env } from 'utils'
import { MINUTE_MS, SECOND_MS } from 'data/constants'
import { useDocumentHidden } from 'hooks/useDocumentHidden'

const UPDATE_INTERVAL_MS = 1 * MINUTE_MS

const log = debug('app:ReloadPrompt')
log.enabled = true

export const ReloadPrompt = () => {
    const isHidden = useDocumentHidden()
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, r) {
            log('registered:' + r)
            if (env.DEV) {
                if (env.VITE_PUSH_NOTIFICATION_ENABLED) {
                    // doesn't seem to update the service worker in dev mode without this
                    updateServiceWorker()
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
                        log('asyncUpdate...')
                        try {
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
                            } else {
                                log('skip updating', resp?.status)
                            }
                        } catch (error) {
                            console.error('sw: reload prompt, error checking for update', error)
                        }
                    }
                    asyncUpdate()
                }
                setInterval(checkInterval, UPDATE_INTERVAL_MS)
            }
        },

        onNeedRefresh() {
            log('need update')
        },

        onOfflineReady() {
            log('offline ready:', offlineReady)
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
        }, SECOND_MS * 5)
        return () => {
            clearTimeout(timeout)
        }
    }, [])

    const [isFailed, setIsFailed] = useState(false)

    const onUpdateClick = useCallback(() => {
        const asyncUpdate = async () => {
            // start a timer to clear all workers and force a reload if the vite-pwa update somehow fails
            // we're not clearing this timeout because this should only happen once
            // and updateServiceWorker() doesn't throw an error if it doesn't work, so we don't want to clear the timeout immediately
            setTimeout(async () => {
                log('update failed, clearing workers and reloading...')
                setIsFailed(true)
                await clearAllWorkers()
                window.location.reload()
            }, SECOND_MS * 20)

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
                setIsFailed(true)
                log('sw: reload prompt, error updating service worker', error)
            }

            log('updateServiceWorker complete')
        }

        if (isUpdating) {
            return
        }
        setIsUpdating(true)

        setTimeout(() => {
            // let the animation settle before requesting the update
            asyncUpdate()
        }, 1 * SECOND_MS)
    }, [isUpdating, updateServiceWorker])

    useEffect(() => {
        if (needRefresh && isHidden) {
            onUpdateClick()
        }
    }, [isHidden, needRefresh, onUpdateClick])

    return (
        <Box
            padding="lg"
            position="fixed"
            bottom="none"
            right="none"
            zIndex="tooltipsAbove"
            color="gray1"
            pointerEvents="none"
        >
            <AnimatePresence>
                {!isVersionHidden ? (
                    <FadeInBox
                        padding
                        key="version"
                        preset="fadeup"
                        borderRadius="md"
                        background="level2"
                        rounded="sm"
                    >
                        <Paragraph>
                            version {APP_VERSION} ({APP_COMMIT_HASH})
                        </Paragraph>
                    </FadeInBox>
                ) : needRefresh && !isHidden ? (
                    <FadeInBox layout preset="fadeup" key="card">
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
                                        <Paragraph textAlign="center">
                                            An update is available. For the best experience, please
                                            update now.
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
                                    {isFailed ? (
                                        <Paragraph color="error">
                                            An error occurred while updating. Reloading...
                                        </Paragraph>
                                    ) : (
                                        <>
                                            <Paragraph>Updating</Paragraph>
                                            <Spinner height="x2" />
                                        </>
                                    )}
                                </FadeInBox>
                            )}
                        </Card>
                    </FadeInBox>
                ) : (
                    <></>
                )}
            </AnimatePresence>
        </Box>
    )
}

async function clearAllWorkers() {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (const registration of registrations) {
        const result = await registration.unregister()
        log(result ? 'successfully unregistered' : 'failed to unregister')
    }
}

if (env.DEV) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.clearAllWorkers = () => clearAllWorkers().then(window.location.reload)
}
