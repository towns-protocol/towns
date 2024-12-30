import React from 'react'
import { useSpaceTips } from 'use-towns-client'
import { Icon, Paragraph, Stack } from '@ui'
import { env } from 'utils'
import { useEthToUsdFormatted } from '@components/Web3/useEthPrice'

export function SpaceTotalTips(props: { spaceId: string }) {
    const { spaceId } = props
    const { data: tips } = useSpaceTips({ spaceId })
    const totalTipsInUsd = useEthToUsdFormatted({
        ethAmount: tips?.amount,
        refetchInterval: 8_000,
    })

    if (!env.VITE_TIPS_ENABLED) {
        return null
    }
    return (
        <Stack horizontal centerContent gap="xs">
            <Icon type="dollarFilled" color="cta1" size="square_md" padding="xxs" />
            <Paragraph>{totalTipsInUsd || '0'} Tips</Paragraph>
        </Stack>
    )
}
