import React, { useEffect, useRef } from 'react'
import { SpaceAddressFromSpaceId } from 'use-towns-client'
import { Button, Icon } from '@ui'
import { Analytics } from 'hooks/useAnalytics'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { getSpaceNameFromCache } from '@components/Analytics/getSpaceNameFromCache'
import { registerContractWithCrossmint } from 'api/crossmint'

interface PayWithCardButtonProps {
    contractAddress: string
    spaceDetailsAnalytics: ReturnType<typeof useGatherSpaceDetailsAnalytics>
    onClick: () => void
}

export function PayWithCardButton({
    contractAddress,
    onClick,
    spaceDetailsAnalytics,
}: PayWithCardButtonProps) {
    const hasAttemptedRegistration = useRef(false)
    const spaceId = SpaceAddressFromSpaceId(contractAddress)

    useEffect(() => {
        const registerContract = async () => {
            if (!contractAddress || hasAttemptedRegistration.current) {
                return
            }

            try {
                hasAttemptedRegistration.current = true
                await registerContractWithCrossmint(contractAddress)
            } catch (error) {
                console.error('Failed to register contract with Crossmint:', error)
            }
        }

        void registerContract()
    }, [contractAddress])

    const handleClick = () => {
        onClick()
        Analytics.getInstance().track('clicked pay with card', {
            spaceName: getSpaceNameFromCache(spaceId),
            spaceId,
            gatedSpace: spaceDetailsAnalytics.gatedSpace,
            pricingModule: spaceDetailsAnalytics.pricingModule,
            priceInWei: spaceDetailsAnalytics.priceInWei,
        })
    }

    return (
        <Button tone="cta1" rounded="lg" onClick={handleClick}>
            <Icon type="creditCard" /> Pay with Card
        </Button>
    )
}
