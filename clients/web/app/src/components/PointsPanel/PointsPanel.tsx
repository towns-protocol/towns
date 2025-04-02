import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRiverPoints, useRiverPointsCheckIn } from 'use-towns-client'
import { AnimatePresence } from 'framer-motion'
import { Signer } from 'ethers'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { Panel } from '@components/Panel/Panel'
import { mapToErrorMessage } from '@components/Web3/utils'
import { Box, Button, Paragraph, Stack } from '@ui'
import { GetSigner, WalletReady } from 'privy/WalletReady'
import { FadeInBox } from '@components/Transitions'
import { useCombinedAuth } from 'privy/useCombinedAuth'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { useMyAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { CountdownPill, RiverPointsPill, StreakPill } from './PointsPanelPills'

const BeaverAnimation = React.lazy(() =>
    import('./BeaverAnimation').then((mod) => ({ default: mod.BeaverAnimation })),
)

const PixelFontLoader = React.lazy(() =>
    import('./PixelFontLoader').then((mod) => ({ default: mod.PixelFontLoader })),
)

export const RiverPointsPanel = () => {
    const { data: abstractAccountAddress } = useMyAbstractAccountAddress()

    const { checkIn, data, isSubmitting, isPointsSuccess } = useHandleCheckin(
        abstractAccountAddress as `0x${string}`,
    )

    const [isPending, setIsPending] = useState(false)

    const onSubmit = async (getSigner: GetSigner) => {
        if (isPending) {
            return false
        }

        setIsPending(true)

        const signer = await getSigner()

        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            setIsPending(false)
            return false
        }

        try {
            checkIn(signer)
        } catch (e) {
            console.log('[river-points] failure')
            return false
        } finally {
            setIsPending(false)
        }

        return true
    }

    return (
        <Panel label="Towns Points" position="relative">
            <Suspense fallback={<BeaverLoader />}>
                <>
                    <PixelFontLoader>
                        <WalletReady LoginButton={<LoginButton />}>
                            {({ getSigner }) => {
                                return (
                                    <BeaverAnimation
                                        isSubmitting={isSubmitting}
                                        isPointsSuccess={isPointsSuccess}
                                        abstractAccountAddress={abstractAccountAddress}
                                        isActive={!!data?.isActive}
                                        points={data?.riverPoints}
                                        lastCheckIn={data?.lastCheckIn}
                                        onBellyRub={async () => {
                                            return onSubmit(getSigner)
                                        }}
                                    />
                                )
                            }}
                        </WalletReady>
                    </PixelFontLoader>
                </>
            </Suspense>
            <Stack
                horizontal
                padding
                position="topLeft"
                width="100%"
                gap="sm"
                justifyContent="spaceBetween"
            >
                <AnimatePresence>
                    <>
                        {data && (
                            <FadeInBox>
                                <RiverPointsPill
                                    riverPoints={data.riverPoints}
                                    isActive={data.isActive}
                                    isPointsSuccess={isPointsSuccess}
                                />
                            </FadeInBox>
                        )}

                        {!!data?.currentStreak && (
                            <FadeInBox horizontal gap="sm">
                                <StreakPill streak={data.currentStreak} />
                                <CountdownPill lastCheckIn={data.lastCheckIn} />
                            </FadeInBox>
                        )}
                    </>
                </AnimatePresence>
            </Stack>
        </Panel>
    )
}

const LoginButton = () => {
    const { privyLogin } = useCombinedAuth()
    return (
        <Box absoluteFill centerContent gap>
            <Paragraph color="gray2">Please reauthenticate in order to check-in</Paragraph>
            <Button icon="arrowCircle" onClick={() => privyLogin()}>
                Reauthenticate
            </Button>
        </Box>
    )
}

const BeaverLoader = () => {
    return (
        <Box centerContent absoluteFill gap="sm">
            <ButtonSpinner />
        </Box>
    )
}

const useHandleCheckin = (abstractAccountAddress: `0x${string}` | undefined) => {
    const { data } = useRiverPoints(abstractAccountAddress as `0x${string}`)

    // keep track of the number of points when submitting a check-in
    const currentPointsRef = useRef<number>()
    const isAwaitingPointsRef = useRef(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isPointsSuccess, setIsPointsSuccess] = useState(false)

    useEffect(() => {
        if (
            !isAwaitingPointsRef.current ||
            !data?.riverPoints ||
            currentPointsRef.current === undefined
        ) {
            return
        }
        const incrementPoints = data.riverPoints - currentPointsRef.current
        console.log('[river-points] incrementPoints', incrementPoints)
        if (incrementPoints) {
            isAwaitingPointsRef.current = false
            currentPointsRef.current = data.riverPoints
            popupToast(({ toast }) => (
                <StandardToast.Success
                    icon="beaver"
                    message={`You've earned +${incrementPoints} point${
                        incrementPoints > 1 ? 's' : ''
                    }!`}
                    subMessage="Come back in 24 hours to continue your streak."
                    toast={toast}
                />
            ))
        }
    }, [data?.riverPoints])

    const onSuccess = useCallback(() => {
        console.log('[river-points] onSuccess')
        setIsSubmitting(false)
        setIsPointsSuccess(true)
        isAwaitingPointsRef.current = true
        currentPointsRef.current = data?.riverPoints ?? 0
    }, [data?.riverPoints])

    const onError = useCallback((error: Error | undefined) => {
        console.log('[river-points] onError', error)
        setIsSubmitting(false)
        setIsPointsSuccess(false)
        popupToast(({ toast }) => (
            <StandardToast.Error
                icon="beaver"
                message="An error occurred while checking-in."
                subMessage={mapToErrorMessage({
                    error,
                    source: 'check in',
                })}
                toast={toast}
            />
        ))
    }, [])

    const onPotential = useCallback(() => {
        console.log('[river-points] onPotential')
    }, [])

    const onPending = useCallback(() => {
        console.log('[river-points] onPending')
        setIsSubmitting(true)
    }, [])

    const { checkIn: checkInTransaction, isLoading } = useRiverPointsCheckIn(
        abstractAccountAddress as `0x${string}`,
        {
            onSuccess,
            onError,
            onPotential,
            onPending,
        },
    )

    useEffect(() => {
        console.log('[river-points] isLoading', isLoading)
    }, [isLoading])

    const checkIn = useCallback(
        (signer: Signer) => {
            currentPointsRef.current = data?.riverPoints
            checkInTransaction({ signer })
        },
        [checkInTransaction, data?.riverPoints],
    )

    return {
        checkIn,
        data,
        isSubmitting,
        isPointsSuccess,
    }
}
