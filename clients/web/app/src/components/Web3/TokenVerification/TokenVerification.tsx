import React, { PropsWithChildren, useEffect, useRef } from 'react'
import {
    useLinkWalletTransaction,
    useLinkedWallets,
    useUnlinkWalletTransaction,
} from 'use-zion-client'
import { Address } from 'wagmi'
import { useWallets } from '@privy-io/react-auth'
import { useGetEmbeddedSigner } from '@towns/privy'
import { Button, Grid, Icon, IconButton, MotionBox, Stack, Text } from '@ui'
import { useErrorToast } from 'hooks/useErrorToast'
import { useAuth } from 'hooks/useAuth'
import { TokenGatingMembership, useTokensGatingMembership } from 'hooks/useTokensGatingMembership'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { isTouch } from 'hooks/useDevice'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useJoinTown } from 'hooks/useJoinTown'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { FullPanelOverlay, LinkedWallet, useConnectThenLink } from '../WalletLinkingPanel'
import { mapToErrorMessage } from '../utils'
import { currentWalletLinkingStore, useTokenBalances } from './tokenStatus'
import { CopyWalletAddressButton, OpenSeaButton } from './Buttons'
import { TokenBox } from './TokenBox'

export function TokenVerification({ onHide, spaceId }: { spaceId: string; onHide: () => void }) {
    const { data: linkedWallets } = useLinkedWallets()
    const { loggedInWalletAddress } = useAuth()
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

    const { wallets: connectedWallets } = useWallets()

    async function onUnlinkClick(addressToUnlink: Address) {
        const signer = await getSigner()
        if (!signer || !connectedWallets) {
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

                {linkedWallets !== undefined && (
                    <Content tokensGatingMembership={tokensGatingMembership}>
                        {linkedWallets.map((a) => {
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
                )}

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
    const { chainId } = useEnvironment()
    const columns = isTouch() ? 1 : tokensLength > 2 ? 3 : tokensLength > 1 ? 2 : 1
    const tokenStatuses = useTokenBalances({
        chainId,
        tokensGatingMembership: tokensGatingMembership['tokens'],
    })
    const noAssets = currentWalletLinkingStore((s) => s.noAssets)
    const spaceId = useSpaceIdFromPathname()
    const { joinSpace, errorMessage: errorJoinSpace } = useJoinTown(spaceId)
    const triedToJoin = useRef(false)

    const {
        isLoading: isLoadingLinkingWallet,
        linkWalletTransaction,
        error: errorLinkWallet,
    } = useLinkWalletTransaction()

    const connectWalletThenLink = useConnectThenLink({
        onLinkWallet: linkWalletTransaction,
    })
    const singleTokenAddress =
        tokensLength === 1
            ? (tokensGatingMembership?.tokens[0]?.contractAddress as Address)
            : undefined

    useErrorToast({
        errorMessage: errorLinkWallet ? mapToErrorMessage(errorLinkWallet) : undefined,
    })

    useErrorToast({
        errorMessage: errorJoinSpace ? errorJoinSpace : undefined,
    })

    const allTokensSuccessful =
        tokenStatuses.length && tokenStatuses.every((t) => t.balance && t.balance > 0)

    useEffect(() => {
        if (allTokensSuccessful && !triedToJoin.current) {
            triedToJoin.current = true
            setTimeout(() => {
                joinSpace()
            }, 500)
        }
    }, [allTokensSuccessful, joinSpace])

    return (
        <>
            <Grid horizontal centerContent columns={columns}>
                {tokensGatingMembership.tokens.map((token) => {
                    return (
                        <TokenBox
                            key={token.contractAddress as Address}
                            token={token}
                            tokensLength={tokensLength}
                            chainId={chainId}
                        />
                    )
                })}
            </Grid>

            {allTokensSuccessful ? (
                <Stack gap>
                    Joining Town <ButtonSpinner />
                </Stack>
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
                        Link another wallet
                    </Button>

                    <CopyWalletAddressButton />

                    {singleTokenAddress && (
                        <OpenSeaButton singleTokenAddress={singleTokenAddress} />
                    )}
                    {isLoadingLinkingWallet && <FullPanelOverlay text="Linking Wallet" />}
                </>
            )}
        </>
    )
}
