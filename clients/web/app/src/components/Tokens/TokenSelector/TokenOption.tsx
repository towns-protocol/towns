import React from 'react'
import { Box, Paragraph } from '@ui'
import { shortAddress } from 'ui/utils/utils'
import { Token } from './tokenSchemas'
import { TokenImage } from './TokenImage'
import { TokenSelectorStyles } from './TokenSelector.css'
import { NetworkName } from './NetworkName'

export function TokenOption({
    token,
    onAddItem,
}: {
    token: Token
    onAddItem: (token: Token) => void
}) {
    return (
        <Box gap="sm">
            <NetworkName chainId={token.chainId} />
            <Box
                horizontal
                alignItems="center"
                gap="sm"
                rounded="xs"
                padding="sm"
                cursor="pointer"
                data-testid={`token-selector-option-${token.chainId}-${token.data?.address}`}
                as="button"
                type="button"
                color="default"
                className={TokenSelectorStyles}
                onClick={() => {
                    onAddItem(token)
                }}
            >
                <TokenImage imgSrc={token.data.imgSrc} width="x4" />
                <Box alignItems="start" justifyContent="spaceBetween" height="x4">
                    <Paragraph truncate>
                        {token.data?.label ? token.data.label : 'Unknown Token'}
                    </Paragraph>
                    {token.data?.address && (
                        <Box color="gray2" fontSize="sm" tooltip={token.data?.address}>
                            {shortAddress(token.data?.address)}
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    )
}
