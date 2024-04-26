import React, { PropsWithChildren, useCallback, useState } from 'react'
import {
    Address,
    BlockchainTransactionType,
    useConnectivity,
    useIsTransactionPending,
    useLinkEOAToRootKeyTransaction,
    useLinkedWallets,
    useUnlinkWalletTransaction,
} from 'use-towns-client'
import { useGetEmbeddedSigner } from '@towns/privy'
import { Button, Grid, Icon, IconButton, MotionBox, Stack, Text } from '@ui'
import { useErrorToast } from 'hooks/useErrorToast'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { isTouch } from 'hooks/useDevice'
import { useJoinTown } from 'hooks/useJoinTown'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { TokenGatingMembership, useTokensGatingMembership } from 'hooks/useTokensGatingMembership'
import { FullPanelOverlay, LinkedWallet, useConnectThenLink } from '../WalletLinkingPanel'
import { mapToErrorMessage } from '../utils'
import { currentWalletLinkingStore, useTokenBalances } from './tokenStatus'
import { TokenBox } from './TokenBox'

export function TokenVerification({ onHide, spaceId }: { spaceId: string; onHide: () => void }) {
    const { data: linkedWallets } = useLinkedWallets()
    const { loggedInWalletAddress } = useConnectivity()
    const { data: tokensGatingMembership } = useTokensGatingMembership(spaceId)
    const tokensLength = tokensGatingMembership?.tokens.length ?? 0
    const maxWidth = tokensLength > 2 ? 'auto' : '400'
    const getSigner = useGetEmbeddedSigner()

    const {
        isLoading: isLoadingUnlinkingWallet,
        unlinkWalletTransaction,
        error: errorUnlinkWallet,
    } = useUnlinkWalletTransaction()

    useErrorToast({
        errorMessage: errorUnlinkWallet ? mapToErrorMessage(errorUnlinkWallet) : undefined,
    })

    async function onUnlinkClick(addressToUnlink: Address) {
        const signer = await getSigner()
        if (!signer) {
            createPrivyNotAuthenticatedNotification()
            return
        }
        unlinkWalletTransaction(signer, addressToUnlink)
    }

    return (
        <Stack position="relative" padding="lg" paddingTop="md" maxWidth={maxWidth} overflow="auto">
            <Stack alignItems="end">
                <IconButton icon="close" onClick={onHide} />
            </Stack>
            <Stack gap alignItems="center">
                <Text strong size="lg">
                    Digital Asset Required
                </Text>
                <Text color="gray1">{`To join this town, you need to prove ownership of the following digital asset(s):`}</Text>

                <Content tokensGatingMembership={tokensGatingMembership}>
                    {linkedWallets !== undefined &&
                        linkedWallets.map((a) => {
                            return (
                                <Stack width="100%" key={a}>
                                    <LinkedWallet
                                        height="x7"
                                        address={a as Address}
                                        loggedInWalletAddress={loggedInWalletAddress ?? '0x'}
                                        onUnlinkClick={onUnlinkClick}
                                    />
                                </Stack>
                            )
                        })}
                </Content>

                {isLoadingUnlinkingWallet && <FullPanelOverlay text="Unlinking Wallet" />}
            </Stack>
        </Stack>
    )
}

function Content({
    tokensGatingMembership,
    children,
}: PropsWithChildren<{
    tokensGatingMembership: TokenGatingMembership
}>) {
    const tokensLength = tokensGatingMembership.tokens.length
    const { baseChain } = useEnvironment()
    const chainId = baseChain.id
    const columns = isTouch() ? 1 : tokensLength > 2 ? 3 : tokensLength > 1 ? 2 : 1
    const { data: tokenBalances, isLoading: isLoadingBalances } = useTokenBalances({
        chainId,
        tokensGatingMembership: tokensGatingMembership.tokens,
    })
    const noAssets = currentWalletLinkingStore((s) => s.noAssets)
    const spaceId = useSpaceIdFromPathname()
    const { joinSpace, errorMessage: errorJoinSpace } = useJoinTown(spaceId)
    const [isJoining, setIsJoining] = useState(false)
    const isJoinPending = useIsTransactionPending(BlockchainTransactionType.JoinSpace)

    const {
        isLoading: isLoadingLinkingWallet,
        linkEOAToRootKeyTransaction,
        error: errorLinkWallet,
    } = useLinkEOAToRootKeyTransaction()

    const connectWalletThenLink = useConnectThenLink({
        onLinkWallet: linkEOAToRootKeyTransaction,
    })

    useErrorToast({
        errorMessage: errorLinkWallet ? mapToErrorMessage(errorLinkWallet) : undefined,
    })

    useErrorToast({
        errorMessage: errorJoinSpace ? errorJoinSpace : undefined,
    })

    // probably can update to use useHasPermission Persmission.JoinSpace
    // but entitlement is somewhat broken atm
    // also this will update at inteveral of 2s and need to adjust useHasPermission to allow for that
    const allTokensSuccessful =
        tokenBalances?.length && tokenBalances?.every((t) => t.balance && t.balance > 0)

    const onJoinClick = useCallback(async () => {
        if (isJoining) {
            return
        }
        setIsJoining(true)
        await joinSpace()
        setIsJoining(false)
    }, [isJoining, joinSpace])

    return (
        <>
            <Grid horizontal centerContent columns={columns}>
                {tokensGatingMembership.tokens.map((token) => {
                    return (
                        <TokenBox
                            key={token.address as Address}
                            token={token}
                            tokensLength={tokensLength}
                            chainId={chainId}
                        />
                    )
                })}
            </Grid>

            {allTokensSuccessful ? (
                <Button
                    disabled={isJoining || isJoinPending}
                    tone="cta1"
                    width="100%"
                    type="button"
                    onClick={onJoinClick}
                >
                    Join
                </Button>
            ) : (
                <>
                    <MotionBox
                        inset="xs"
                        padding="none"
                        opacity="transparent"
                        animate={{
                            opacity: noAssets ? 1 : 0,
                            bottom: noAssets ? '50px' : 0,
                        }}
                    >
                        <Text color="error" size="sm">
                            No assets found in wallet
                        </Text>
                    </MotionBox>

                    {children}

                    <Button tone="cta1" width="100%" onClick={connectWalletThenLink}>
                        <Icon type="link" />
                        Link a wallet with asset
                    </Button>

                    {isLoadingLinkingWallet && <FullPanelOverlay text="Linking Wallet" />}
                    {isLoadingBalances && (
                        <FullPanelOverlay
                            opacity="opaque"
                            text="Checking assets in your wallets"
                            background="level1"
                        />
                    )}
                </>
            )}
        </>
    )
}
