import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    CrossmintCheckoutProvider,
    CrossmintEmbeddedCheckout,
    CrossmintProvider,
    useCrossmintCheckout,
} from '@crossmint/client-sdk-react-ui'
import { usePrivy } from '@privy-io/react-auth'
import { BASE_MAINNET, SpaceAddressFromSpaceId } from 'use-towns-client'
import { Box, Stack } from '@ui'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { Spinner } from 'ui/components/Spinner'
import { env } from 'utils/environment'
import { Analytics } from 'hooks/useAnalytics'
import { isTouch } from 'hooks/useDevice'
import { useStore } from 'store/store'
import { Figma } from 'ui/styles/palette'
import { useGatherSpaceDetailsAnalytics } from './Analytics/useGatherSpaceDetailsAnalytics'
import { getSpaceNameFromCache } from './Analytics/getSpaceNameFromCache'

interface CrossmintPaymentProps {
    contractAddress: string
    onPaymentStart?: () => void
    onPaymentFailure?: () => void
    onComplete?: () => void
    townWalletAddress?: string
    price: string
}

const CrossmintPaymentContent = ({
    contractAddress,
    onComplete,
    townWalletAddress,
    price,
    onPaymentStart,
    onPaymentFailure,
}: CrossmintPaymentProps) => {
    const { baseChain } = useEnvironment()
    const network = baseChain.id === BASE_MAINNET ? 'base' : 'base-sepolia'
    const [isLoading, setIsLoading] = useState(true)
    const { order } = useCrossmintCheckout()
    const spaceId = SpaceAddressFromSpaceId(contractAddress)
    const analytics = useGatherSpaceDetailsAnalytics({
        spaceId,
    })
    const _isTouch = isTouch()
    const hasTriggeredPayment = useRef(false)
    const hasTriggeredComplete = useRef(false)
    const theme = useStore((s) => s.getTheme())

    const { user } = usePrivy()

    const receiptEmail = useMemo(() => {
        const linkedAccounts = user?.linkedAccounts

        const email = linkedAccounts?.reduce<string | undefined>((acc, account) => {
            // don't include apple oauth email b/c it's a masked email like "939djsjs@privaterelay.appleid.com"
            if (account.type === 'email') {
                acc = account.address
            } else if (account.type === 'google_oauth') {
                acc = account.email
            }
            return acc
        }, undefined)

        // do not default to empty string b/c crossmint modal errors on initial load
        return email
    }, [user?.linkedAccounts])

    const tracked = useMemo(
        () => ({
            spaceName: getSpaceNameFromCache(spaceId),
            spaceId,
            gatedSpace: analytics.gatedSpace,
            pricingModule: analytics.pricingModule,
            priceInWei: analytics.priceInWei,
        }),
        [analytics, spaceId],
    )

    useEffect(() => {
        if (order?.phase === 'completed' && onComplete && !hasTriggeredComplete.current) {
            Analytics.getInstance().track('crossmint order completed', tracked)
            setIsLoading(true)
            onComplete()
            hasTriggeredComplete.current = true
        }
    }, [order?.phase, onComplete, tracked, onPaymentStart])

    useEffect(() => {
        // 'awaiting-payment' status is the first status, while showing form
        // 'in-progress'is a status listed as a type, but it is never this status in my experience
        // 'completed' is the last status, after payment processed, before beginning of nft delivery
        // there is a time gap after clicking the crossmint button and the status updating to this
        if (order?.payment.status === 'completed' && !hasTriggeredPayment.current) {
            Analytics.getInstance().track('clicked submit card payment', tracked)
            onPaymentStart?.()
            hasTriggeredPayment.current = true
        }
    }, [onPaymentStart, order?.payment, tracked])

    // i can only hope that this works
    useEffect(() => {
        if (order?.payment.failureReason) {
            onPaymentFailure?.()
        }
    }, [onPaymentFailure, order?.payment.failureReason])

    useEffect(() => {
        // Give the component a moment to initialize
        const timer = setTimeout(() => setIsLoading(false), 500)
        return () => clearTimeout(timer)
    }, [])

    const isDark = theme === 'dark'

    const backgroundPrimary = useMemo(() => {
        return isDark
            ? _isTouch
                ? Figma.DarkMode.Level1
                : Figma.DarkMode.Level3
            : Figma.LightMode.Level2
    }, [isDark, _isTouch])

    const border = useMemo(() => {
        return isDark
            ? _isTouch
                ? Figma.DarkMode.Level3
                : Figma.DarkMode.Level4
            : Figma.LightMode.Level3
    }, [isDark, _isTouch])

    if (!contractAddress || !townWalletAddress) {
        return null
    }

    return (
        <Box paddingTop="sm" position="relative" minHeight="400">
            {isLoading ? (
                <Stack centerContent height="250">
                    <Spinner />
                </Stack>
            ) : (
                <CrossmintEmbeddedCheckout
                    appearance={{
                        variables: {
                            fontFamily: 'Inter, system-ui, sans-serif',
                            colors: {
                                backgroundPrimary,
                                textPrimary: isDark ? Figma.Colors.White : Figma.Colors.Black,
                                textSecondary: isDark
                                    ? Figma.DarkMode.Secondary
                                    : Figma.LightMode.Secondary,
                                borderPrimary: isDark
                                    ? Figma.DarkMode.Level3
                                    : Figma.LightMode.Level3,
                                accent: Figma.Colors.Green,
                            },
                        },
                        rules: {
                            Input: {
                                colors: {
                                    background: isDark
                                        ? Figma.DarkMode.Level2
                                        : Figma.LightMode.Level2,
                                    text: isDark ? Figma.Colors.White : Figma.Colors.Black,
                                    border,
                                    placeholder: isDark
                                        ? Figma.DarkMode.Secondary
                                        : Figma.LightMode.Secondary,
                                },
                                hover: {
                                    colors: {
                                        background: isDark
                                            ? Figma.DarkMode.Level3
                                            : Figma.LightMode.Level3,
                                    },
                                },
                                focus: {
                                    colors: {
                                        background: isDark
                                            ? Figma.DarkMode.Level3
                                            : Figma.LightMode.Level3,
                                    },
                                },
                            },
                            PrimaryButton: {
                                colors: {
                                    background: Figma.Colors.Green,
                                    text: isDark ? Figma.Colors.Black : Figma.Colors.Black,
                                },
                                hover: {
                                    colors: {
                                        text: isDark ? Figma.Colors.Black : Figma.Colors.Black,
                                        background: 'rgba(33, 224, 120, 0.8)',
                                    },
                                },
                                borderRadius: '24px',
                            },
                            DestinationInput: {
                                display: 'hidden',
                            },
                        },
                    }}
                    lineItems={{
                        collectionLocator: `${network}:${contractAddress}`,
                        callData: {
                            totalPrice: price,
                        },
                    }}
                    recipient={{
                        walletAddress: townWalletAddress,
                    }}
                    payment={{
                        crypto: {
                            enabled: false,
                        },
                        fiat: {
                            enabled: true,
                            allowedMethods: {
                                applePay: true,
                                googlePay: true,
                            },
                        },
                        receiptEmail,
                    }}
                />
            )}
        </Box>
    )
}

export const CrossmintPayment: React.FC<CrossmintPaymentProps> = ({
    contractAddress,
    onComplete,
    onPaymentStart,
    onPaymentFailure,
    townWalletAddress,
    price,
}) => {
    const clientApiKey = env.VITE_CROSSMINT_CLIENT_API_KEY

    if (!clientApiKey) {
        return 'No Crossmint API key provided'
    }

    return (
        <CrossmintProvider apiKey={clientApiKey}>
            <CrossmintCheckoutProvider>
                <CrossmintPaymentContent
                    contractAddress={contractAddress}
                    townWalletAddress={townWalletAddress}
                    price={price}
                    onComplete={onComplete}
                    onPaymentStart={onPaymentStart}
                    onPaymentFailure={onPaymentFailure}
                />
            </CrossmintCheckoutProvider>
        </CrossmintProvider>
    )
}
