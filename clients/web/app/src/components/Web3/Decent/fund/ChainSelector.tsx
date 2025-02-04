import React, { useRef } from 'react'
import { BalanceChainSelector } from '@decent.xyz/box-ui'
import { FadeInBox } from '@components/Transitions/FadeIn'
import { Stack } from '@ui'
import { chainIds } from 'wagmiConfig'
import { useFundContext } from './FundContext'

export function ChainSelector({
    setShowChainSelector,
}: {
    setShowChainSelector: (show: boolean) => void
}) {
    const backgroundRef = useRef<HTMLDivElement>(null)
    const { srcToken, setSrcToken, sender, disabled } = useFundContext()

    const handleBackgroundClick = (e: React.MouseEvent | React.TouchEvent) => {
        if (e.target === backgroundRef.current) {
            setShowChainSelector(false)
        }
    }

    return (
        <FadeInBox
            fast
            centerContent
            preset="fadeup"
            position="fixed"
            top="none"
            left="none"
            right="none"
            bottom="none"
            padding="md"
            rounded="md"
            ref={backgroundRef}
            onClick={handleBackgroundClick}
            onTouchEnd={handleBackgroundClick}
        >
            <Stack rounded="md" padding="md" background="level2">
                {srcToken && (
                    <Stack overflow="auto" maxHeight="75vh">
                        <BalanceChainSelector
                            disabled={disabled}
                            selectedToken={srcToken}
                            setSelectedToken={(t) => {
                                setShowChainSelector(false)
                                setSrcToken(t)
                            }}
                            address={sender}
                            chainId={srcToken.chainId}
                            selectChains={chainIds}
                        />
                    </Stack>
                )}
            </Stack>
        </FadeInBox>
    )
}
