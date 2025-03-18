import React from 'react'
import { Address } from 'use-towns-client'
import { Box, BoxProps, Icon, Text } from '@ui'
import { Token } from '@components/Tokens/TokenSelector/tokenSchemas'
import { TokenImage } from '@components/Tokens/TokenSelector/TokenImage'
import { useTokenMetadataForChainId } from 'api/lib/collectionMetadata'
import { NetworkName } from '@components/Tokens/TokenSelector/NetworkName'
import { Entitlements } from 'hooks/useEntitlements'

export function SelectedToken({
    contractAddress,
    chainId,
    size = 'x3',
    ...boxProps
}: {
    contractAddress: string
    chainId: number
    size?: BoxProps['width']
} & Omit<BoxProps, 'size'>) {
    const { data: tokenDataWithChainId } = useTokenMetadataForChainId(contractAddress, chainId)

    return (
        <Box
            tooltip={
                <Box centerContent gap="sm" padding="sm" background="level2" rounded="sm">
                    <Box horizontal gap="xs" alignItems="center">
                        <Text size="sm">{tokenDataWithChainId?.data.label}</Text>
                        <Text size="sm">·</Text>
                        <NetworkName chainId={chainId} size="sm" color="initial" />
                    </Box>
                    <Text size="xs">{tokenDataWithChainId?.data.address}</Text>
                </Box>
            }
        >
            {tokenDataWithChainId ? (
                <TokenImage imgSrc={tokenDataWithChainId.data?.imgSrc} width={size} />
            ) : (
                <Box
                    centerContent
                    aspectRatio="1/1"
                    background="level4"
                    borderRadius="sm"
                    width={size}
                    {...boxProps}
                />
            )}
        </Box>
    )
}

type EntitlementIconProps = {
    index: number
    isCentered?: boolean
    totalIcons: number
}

const StackedIcon = ({
    children,
    index,
    isCentered,
    totalIcons,
}: React.PropsWithChildren<EntitlementIconProps>) => (
    <Box
        position="absolute"
        top="none"
        style={{
            right: isCentered ? `${(index - totalIcons / 2 + 0.4) * 16}px` : `${index * 16}px`,
        }}
    >
        {children}
    </Box>
)

const TokenIcon = ({
    token,
    index,
    isCentered,
    totalIcons,
}: { token: Token } & EntitlementIconProps) => (
    <StackedIcon index={index} isCentered={isCentered} totalIcons={totalIcons}>
        <SelectedToken contractAddress={token.data.address as Address} chainId={token.chainId} />
    </StackedIcon>
)

const UsersIcon = ({ index, isCentered, totalIcons }: EntitlementIconProps) => (
    <StackedIcon index={index} isCentered={isCentered} totalIcons={totalIcons}>
        <Box
            tooltip="Specific wallet addresses"
            background="level2"
            borderRadius="sm"
            style={{ padding: '3px', marginTop: '-1px' }}
        >
            <Icon type="wallet" size="square_sm" />
        </Box>
    </StackedIcon>
)

const EthBalanceIcon = ({ index, isCentered, totalIcons }: EntitlementIconProps) => (
    <StackedIcon index={index} isCentered={isCentered} totalIcons={totalIcons}>
        <Box
            tooltip="ETH Balance requirement"
            background="level2"
            borderRadius="sm"
            style={{ padding: '3px', marginTop: '-1px' }}
        >
            <Icon type="eth" size="square_sm" />
        </Box>
    </StackedIcon>
)

export const EntitlementsDisplay = ({
    isCentered,
    entitlements,
}: { isCentered?: boolean } & { entitlements: Entitlements }) => {
    const tokensGatedBy = entitlements.tokens
    const usersGatedBy = entitlements.users
    const ethBalanceGatedBy = entitlements.ethBalance

    const hasTokens = tokensGatedBy.length > 0
    const hasUsers = usersGatedBy.length > 0
    const hasEthBalance = ethBalanceGatedBy !== ''

    if (!hasTokens && !hasUsers && !hasEthBalance) {
        return (
            <Box centerContent>
                <Icon type="people" size="square_md" />
            </Box>
        )
    }

    const reservedSlots = (hasUsers ? 1 : 0) + (hasEthBalance ? 1 : 0)
    const maxTokenSlots = 5 - reservedSlots

    const tokens = Array.from(
        tokensGatedBy
            .reduce((map, token) => map.set(token.data.address, token), new Map())
            .values(),
    ).slice(0, maxTokenSlots)

    const totalIcons = tokens.length + reservedSlots

    const icons: JSX.Element[] = []

    if (hasUsers) {
        icons.push(
            <UsersIcon key="users" index={0} isCentered={isCentered} totalIcons={totalIcons} />,
        )
    }

    tokens.forEach((token, index) => {
        icons.push(
            <TokenIcon
                key={`token-${token.data.address}-${token.chainId}`}
                token={token}
                index={hasUsers ? index + 1 : index}
                isCentered={isCentered}
                totalIcons={totalIcons}
            />,
        )
    })

    if (hasEthBalance) {
        icons.push(
            <EthBalanceIcon
                key="eth"
                index={tokens.length + (hasUsers ? 1 : 0)}
                isCentered={isCentered}
                totalIcons={totalIcons}
            />,
        )
    }

    return (
        <Box horizontal gap="xs" alignItems="center" justifyContent="center" width="100%">
            <Box position="relative" width="x3" aspectRatio="1/1" flexDirection="rowReverse">
                {icons}
            </Box>
        </Box>
    )
}
