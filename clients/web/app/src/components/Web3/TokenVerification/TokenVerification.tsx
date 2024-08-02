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
import { Button, Icon, IconButton, MotionBox, Paragraph, Stack, Text } from '@ui'
import { useErrorToast } from 'hooks/useErrorToast'
import { useJoinTown } from 'hooks/useJoinTown'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { TokenGatingMembership, useTokensGatingMembership } from 'hooks/useTokensGatingMembership'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { TokenDetailsWithWalletMatch } from 'routes/RoleRestrictedChannelJoinPanel'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { FullPanelOverlay, LinkedWallet, useConnectThenLink } from '../WalletLinkingPanel'
import { mapToErrorMessage } from '../utils'
import { currentWalletLinkingStore, useTokenBalances } from './tokenStatus'

export function TokenVerification({ onHide, spaceId }: { spaceId: string; onHide: () => void }) {
    const { data: linkedWallets } = useLinkedWallets()
    const { loggedInWalletAddress } = useConnectivity()
    const { data: tokensGatingMembership } = useTokensGatingMembership(spaceId)
    const tokensLength = tokensGatingMembership?.tokens.length ?? 0
    const maxWidth = tokensLength > 2 ? 'auto' : '400'
    const { getSigner } = useGetEmbeddedSigner()
    const { data: aaAdress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })

    const {
        isLoading: isLoadingUnlinkingWallet,
        unlinkWalletTransaction,
        error: errorUnlinkWallet,
    } = useUnlinkWalletTransaction()

    useErrorToast({
        errorMessage: errorUnlinkWallet
            ? mapToErrorMessage({
                  error: errorUnlinkWallet,
                  source: 'token verification unlink wallet',
              })
            : undefined,
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

                <Content
                    linkedWallets={linkedWallets}
                    tokensGatingMembership={tokensGatingMembership}
                >
                    {linkedWallets && linkedWallets.length > 1 ? (
                        <Paragraph strong>Linked Wallets</Paragraph>
                    ) : null}
                    {linkedWallets !== undefined &&
                        linkedWallets
                            // exclude showing the aaAdress in the list of linked wallets for digital asset requirement
                            // we don't want users sending assets here
                            .filter((a) => a !== aaAdress)
                            .map((a) => {
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
    linkedWallets,
    children,
}: PropsWithChildren<{
    linkedWallets: string[] | undefined
    tokensGatingMembership: TokenGatingMembership
}>) {
    const { data: tokensInWallet, isLoading: isLoadingTokensInWallet } = useTokenBalances({
        tokens: tokensGatingMembership.tokens,
        refetchInterval: 4_000,
    })
    const noAssets = currentWalletLinkingStore((s) => s.noAssets)
    const spaceId = useSpaceIdFromPathname()
    const { joinSpace, errorMessage: errorJoinSpace } = useJoinTown(spaceId)
    const [isJoining, setIsJoining] = useState(false)
    const isJoinPending = useIsTransactionPending(BlockchainTransactionType.JoinSpace)
    const { isPrivyReady } = useGetEmbeddedSigner()

    const {
        isLoading: isLoadingLinkingWallet,
        linkEOAToRootKeyTransaction,
        error: errorLinkWallet,
    } = useLinkEOAToRootKeyTransaction()

    const connectWalletThenLink = useConnectThenLink({
        onLinkWallet: linkEOAToRootKeyTransaction,
    })

    useErrorToast({
        errorMessage: errorLinkWallet
            ? mapToErrorMessage({
                  error: errorLinkWallet,
                  source: 'token verification link wallet',
              })
            : undefined,
    })

    useErrorToast({
        errorMessage: errorJoinSpace ? errorJoinSpace : undefined,
    })

    // probably can update to use useHasPermission Persmission.JoinSpace
    // but entitlement is somewhat broken atm
    // also this will update at inteveral of 2s and need to adjust useHasPermission to allow for that
    const allTokensSuccessful =
        tokensInWallet?.length && tokensInWallet?.every((t) => t.data?.status === 'success')

    const onJoinClick = useCallback(async () => {
        if (isJoining) {
            return
        }
        setIsJoining(true)
        await joinSpace()
        setIsJoining(false)
    }, [isJoining, joinSpace])

    if (linkedWallets === undefined || isLoadingTokensInWallet) {
        return (
            <Stack centerContent height="x20">
                <ButtonSpinner />
            </Stack>
        )
    }

    return (
        <>
            <Stack width="100%" gap="sm">
                {isLoadingTokensInWallet ? (
                    <Stack centerContent height="x16" background="negative">
                        <ButtonSpinner />
                    </Stack>
                ) : (
                    tokensGatingMembership.tokens.map((token) => {
                        return (
                            <TokenDetailsWithWalletMatch
                                key={token.address as Address}
                                tokensInWallet={tokensInWallet}
                                token={token}
                            />
                        )
                    })
                )}
            </Stack>

            {allTokensSuccessful ? (
                <Button
                    disabled={!isPrivyReady || isJoining || isJoinPending}
                    tone="cta1"
                    width="100%"
                    type="button"
                    onClick={onJoinClick}
                >
                    Join
                </Button>
            ) : (
                <>
                    {linkedWallets && linkedWallets.length > 1 ? (
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
                                Wallet missing assets
                            </Text>
                        </MotionBox>
                    ) : null}

                    {children}

                    <Button tone="cta1" width="100%" onClick={connectWalletThenLink}>
                        <Icon type="link" />
                        Link a wallet with asset
                    </Button>

                    {isLoadingLinkingWallet && <FullPanelOverlay text="Linking Wallet" />}
                </>
            )}
        </>
    )
}
