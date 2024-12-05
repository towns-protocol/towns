import React, { useEffect, useMemo, useState } from 'react'
import {
    CrossmintCheckoutProvider,
    CrossmintEmbeddedCheckout,
    CrossmintProvider,
    useCrossmintCheckout,
} from '@crossmint/client-sdk-react-ui'
import { BASE_MAINNET, SpaceAddressFromSpaceId } from 'use-towns-client'
import { Box, Stack } from '@ui'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { Spinner } from 'ui/components/Spinner'
import { env } from 'utils/environment'
import { Analytics } from 'hooks/useAnalytics'
import { useGatherSpaceDetailsAnalytics } from './Analytics/useGatherSpaceDetailsAnalytics'
import { getSpaceNameFromCache } from './Analytics/getSpaceNameFromCache'

interface CrossmintPaymentProps {
    contractAddress: string
    onComplete?: () => void
    townWalletAddress?: string
    price: string
}

const CrossmintPaymentContent = ({
    contractAddress,
    onComplete,
    townWalletAddress,
    price,
}: CrossmintPaymentProps) => {
    const { baseChain } = useEnvironment()
    const network = baseChain.id === BASE_MAINNET ? 'base' : 'base-sepolia'
    const [isLoading, setIsLoading] = useState(true)
    const { order } = useCrossmintCheckout()
    const spaceId = SpaceAddressFromSpaceId(contractAddress)
    const analytics = useGatherSpaceDetailsAnalytics({
        spaceId,
    })

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
        if (order?.phase === 'payment') {
            Analytics.getInstance().track('clicked submit card payment', tracked)
        }
        if (order?.phase === 'completed' && onComplete) {
            Analytics.getInstance().track('crossmint order completed', tracked)
            onComplete()
        }
    }, [order?.phase, onComplete, tracked])

    console.log({ price, priceInWei: analytics.priceInWei })

    useEffect(() => {
        // Give the component a moment to initialize
        const timer = setTimeout(() => setIsLoading(false), 500)
        return () => clearTimeout(timer)
    }, [])

    if (!contractAddress || !townWalletAddress) {
        return null
    }

    return (
        <Box background="level1" paddingTop="sm" position="relative" minHeight="400" minWidth="400">
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
                                backgroundPrimary: '#1A1A1A',
                                textPrimary: '#FFFFFF',
                                textSecondary: '#A0A0A0',
                                borderPrimary: '#333333',
                                accent: '#21E078',
                            },
                        },
                        rules: {
                            Input: {
                                colors: {
                                    background: '#2D2D2D',
                                    border: '#404040',
                                    text: '#FFFFFF',
                                    placeholder: '#666666',
                                },
                            },
                            PrimaryButton: {
                                colors: {
                                    background: '#21E078',
                                    text: '#000',
                                },
                                hover: {
                                    colors: {
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
                    }}
                />
            )}
        </Box>
    )
}

export const CrossmintPayment: React.FC<CrossmintPaymentProps> = ({
    contractAddress,
    onComplete,
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
                />
            </CrossmintCheckoutProvider>
        </CrossmintProvider>
    )
}
