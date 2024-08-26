import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router'
import {
    Address,
    BlockchainTransactionType,
    EVERYONE_ADDRESS,
    Permission,
    RoleEntitlements,
    blockchainQueryKeys,
    convertRuleDataV1ToV2,
    useChannelSettings,
    useConnectivity,
    useGetRootKeyFromLinkedWallet,
    useHasPermission,
    useIsTransactionPending,
    useLinkEOAToRootKeyTransaction,
    useLinkedWallets,
    useSpaceData,
    useUser,
} from 'use-towns-client'
import headlessToast, { Toast } from 'react-hot-toast/headless'
import { utils } from 'ethers'
import { Panel } from '@components/Panel/Panel'
import { Box, Button, Icon, MotionIcon, Pill, Stack, Text } from '@ui'
import { Accordion } from 'ui/components/Accordion/Accordion'
import { convertRuleDataToTokenFormSchema } from '@components/Tokens/utils'
import { Avatar } from '@components/Avatar/Avatar'
import { TokenEntitlement } from '@components/Tokens/TokenSelector/tokenSchemas'
import { TokenImage } from '@components/Tokens/TokenSelector/TokenImage'
import { useTokenMetadataForChainId } from 'api/lib/collectionMetadata'
import { TokenSelectionDisplay } from '@components/Tokens/TokenSelector/TokenSelection'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useConnectThenLink } from '@components/Web3/WalletLinkingPanel'
import { PrivyWrapper } from 'privy/PrivyProvider'
import {
    checkWalletsForTokens2QueryDataBalances,
    useTokenBalances,
} from '@components/Web3/TokenVerification/tokenStatus'
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { mapToErrorMessage } from '@components/Web3/utils'
import { usePanelActions } from './layouts/hooks/usePanelActions'
import { useOnJoinChannel } from './AllChannelsList/AllChannelsList'

export const RoleRestrictedChannelJoinPanel = React.memo(() => {
    return (
        <PrivyWrapper>
            <RoleRestrictedChannelJoinPanelWithoutAuth />
        </PrivyWrapper>
    )
})

function RoleRestrictedChannelJoinPanelWithoutAuth() {
    const { data: channelId } = usePanelActions()
    const { spaceSlug } = useParams()

    const { channelSettings, isLoading } = useChannelSettings(spaceSlug ?? '', channelId ?? '')

    const roles = channelSettings?.roles

    return (
        <Panel label="Role Required to Join">
            {isLoading && <ButtonSpinner />}
            {roles && (
                <Roles
                    roles={roles}
                    spaceId={spaceSlug}
                    channelName={channelSettings.name}
                    channelId={channelId ?? undefined}
                />
            )}
        </Panel>
    )
}

function Roles(props: {
    roles: RoleEntitlements[]
    spaceId: string | undefined
    channelId: string | undefined
    channelName: string
}) {
    const { roles, spaceId, channelId, channelName } = props

    const { loggedInWalletAddress } = useConnectivity()

    const {
        hasPermission: canJoinChannel,
        invalidate: invalidateJoinChannel,
        getQueryData: getJoinChannelQueryData,
    } = useHasPermission({
        walletAddress: loggedInWalletAddress,
        spaceId,
        channelId: channelId ?? '',
        permission: Permission.Read,
    })

    const space = useSpaceData()

    const {
        syncingSpace,
        joinFailed,
        setJoinFailed,
        onClick: onJoinClick,
    } = useOnJoinChannel({
        channelId: channelId ?? undefined,
        space,
        isJoined: false,
    })

    useShowToast({
        condition: joinFailed,
        onPostNotification: () => setJoinFailed(false),
        ToastComponent: ({ resetToast, toast }) => (
            <StandardToast.Error
                message="There was an error joining the channel. Please try again in a few minutes."
                toast={toast}
                onDismiss={resetToast}
            />
        ),
    })

    const { linkEOAToRootKeyTransaction } = useLinkEOAToRootKeyTransaction({
        onSuccess: async () => {
            if (!channelId || !loggedInWalletAddress) {
                return
            }
            await invalidateJoinChannel()
            const canJoin = getJoinChannelQueryData()

            if (canJoin) {
                const qualifiedRoles: string[] = []
                const wallets = blockchainQueryKeys.linkedWallets(loggedInWalletAddress)

                for (const role of roles) {
                    const { hasUserEntitlement, hasRuleEntitlement, qualifiesForUserEntitlement } =
                        getGeneralEntitlementData({ role, wallets })

                    const tokenBalances = checkWalletsForTokens2QueryDataBalances()

                    const hasMatchingToken = Object.values(tokenBalances).some((b) => b > 0)

                    if (
                        qualifiesForRole({
                            hasUserEntitlement,
                            hasRuleEntitlement,
                            qualifiesForUserEntitlement,
                            isLoadingTokensInWallet: false,
                            hasMatchingToken,
                        })
                    ) {
                        qualifiedRoles.push(role.name)
                    }
                }
                headlessToast.dismiss()
                popupToast(({ toast: t }) => (
                    <StandardToast.Success
                        message={`You've been verified for the ${qualifiedRoles.join(', ')} role${
                            qualifiedRoles.length > 1 ? 's' : ''
                        } and now have access to this channel.`}
                        cta={`Go to #${channelName}`}
                        toast={t}
                        onCtaClick={async ({ dismissToast }) => {
                            const result = await onJoinClick({
                                navigateWithPanel: false,
                            })
                            if (result) {
                                dismissToast()
                            }
                        }}
                    />
                ))
            } else {
                headlessToast.dismiss()
                popupToast(({ toast: t }) => (
                    <StandardToast.Error
                        message={`You've linked your wallet, but you don't have the required roles to join this channel.`}
                        toast={t}
                    />
                ))
            }
        },
        onError: async (e) => {
            headlessToast.dismiss()
            console.error('Error linking wallet to root key', e)
            popupToast(({ toast: t }) => (
                <StandardToast.Error
                    message={
                        mapToErrorMessage({ error: e, source: 'restricted join channel panel' }) ??
                        'There was an error linking your wallet.'
                    }
                    toast={t}
                />
            ))
        },
    })

    const onLinkEOAClick = useConnectThenLink({
        onLinkWallet: linkEOAToRootKeyTransaction,
    })
    const isWalletLinkingPending = useIsTransactionPending(BlockchainTransactionType.LinkWallet)

    return (
        <>
            <RolesList roles={roles} />
            <Stack grow gap="sm" justifyContent="end">
                {canJoinChannel && (
                    <Button
                        tone="level2"
                        disabled={syncingSpace}
                        onClick={async () => {
                            await onJoinClick({ navigateWithPanel: false })
                        }}
                    >
                        {syncingSpace && <ButtonSpinner />} Go to #{channelName}
                    </Button>
                )}

                <Button
                    tone={syncingSpace || isWalletLinkingPending ? 'level2' : 'cta1'}
                    disabled={syncingSpace || isWalletLinkingPending}
                    onClick={onLinkEOAClick}
                >
                    <Icon type="link" /> Link Wallet
                </Button>
            </Stack>
        </>
    )
}

export function RolesList(props: {
    roles: RoleEntitlements[]
    hideNegativeUI?: boolean
    tone?: 'default' | 'lighter'
    headerSubtitle?: (role: RoleEntitlements) => string
}) {
    const { roles, hideNegativeUI, headerSubtitle, tone } = props
    const { allWallets, newWallets } = useTrackedWallets()

    const showQualifiedStatus =
        (allWallets && allWallets.length > 1) || (newWallets && newWallets.length > 0)

    return roles
        ? roles.map((role) => {
              return (
                  <RoleAccordion
                      key={role.roleId}
                      role={role}
                      wallets={allWallets}
                      showQualifiedStatus={showQualifiedStatus}
                      tone={tone}
                      header={(props) => (
                          <AccordionHeader
                              {...props}
                              subTitle={headerSubtitle ? headerSubtitle(role) : props.subTitle}
                              hideNegativeUI={hideNegativeUI ?? false}
                          />
                      )}
                  />
              )
          })
        : null
}

function RoleAccordion(props: {
    role: RoleEntitlements
    wallets: string[] | undefined
    showQualifiedStatus?: boolean
    tone?: 'default' | 'lighter'
    header: (props: {
        qualified?: boolean
        title: string
        subTitle: string
        isExpanded: boolean
        tokens: TokenEntitlement[]
        role: RoleEntitlements
    }) => JSX.Element
}) {
    const { role, wallets, showQualifiedStatus, header, tone: _tone } = props
    const tone = _tone ?? 'default'
    const {
        hasUserEntitlement,
        hasRuleEntitlement,
        tokens,
        tokenTypes,
        qualifiesForUserEntitlement,
    } = getGeneralEntitlementData({ role, wallets })

    const { data: tokensInWallet, isLoading: isLoadingTokensInWallet } = useTokenBalances({
        tokens,
    })

    const hasMatchingToken = tokensInWallet?.some((d) => d.data?.status === 'success')

    const _qualifiesForRole = useMemo(() => {
        if (!showQualifiedStatus) {
            return
        }
        return qualifiesForRole({
            hasUserEntitlement,
            hasRuleEntitlement,
            qualifiesForUserEntitlement,
            isLoadingTokensInWallet,
            hasMatchingToken,
        })
    }, [
        hasMatchingToken,
        hasRuleEntitlement,
        hasUserEntitlement,
        isLoadingTokensInWallet,
        qualifiesForUserEntitlement,
        showQualifiedStatus,
    ])

    const subTitle = useMemo(() => {
        let message = ''
        if (hasUserEntitlement) {
            message += `${role.users.length} member${role.users.length > 1 ? 's' : ''} whitelisted`
        }
        if (hasRuleEntitlement) {
            message += `${message.length > 0 ? ', ' : ''}${tokenTypes} Required`
        }

        return message
    }, [hasRuleEntitlement, hasUserEntitlement, role.users.length, tokenTypes])

    return (
        <Accordion
            border={_qualifiesForRole ? 'positive' : 'faint'}
            background={tone === 'lighter' ? 'level3' : 'level2'}
            header={({ isExpanded }) =>
                header({
                    qualified: _qualifiesForRole,
                    title: role.name,
                    subTitle,
                    isExpanded,
                    tokens,
                    role,
                })
            }
        >
            <Stack>
                {hasUserEntitlement && <UserList users={role.users} />}
                {hasRuleEntitlement && (
                    <Stack gap="sm">
                        {tokens.map((token) => (
                            <TokenDetailsWithWalletMatch
                                key={token.address}
                                token={token}
                                tokensInWallet={showQualifiedStatus ? tokensInWallet : undefined}
                            />
                        ))}
                    </Stack>
                )}
            </Stack>
        </Accordion>
    )
}

export function TokenDetailsWithWalletMatch(props: {
    token: TokenEntitlement
    tokensInWallet: ReturnType<typeof useTokenBalances>['data']
}) {
    const { token, tokensInWallet } = props
    const match = tokensInWallet?.find((t) => t.data?.tokenAddress === token.address)
    const ownsToken = match?.data ? match.data.status === 'success' : undefined
    const { data: tokenMetadata } = useTokenMetadataForChainId(token.address, token.chainId)

    const isAddress = utils.isAddress(token.address)

    if (!isAddress) {
        return null
    }

    return (
        <TokenSelectionDisplay
            elevate
            data={{
                ...token,
                imgSrc: tokenMetadata?.data.imgSrc ?? '',
                label: tokenMetadata?.data.label ?? token.address,
                address: token.address as Address,
                openSeaCollectionUrl: tokenMetadata?.data.openSeaCollectionUrl,
            }}
            chainId={token.chainId}
            userOwnsToken={ownsToken}
        />
    )
}

function UserList({ users }: { users: string[] }) {
    return (
        <Stack horizontal padding="sm" gap="xs" flexWrap="wrap" rounded="md" background="level3">
            {users.map((user) => (
                <User key={user} wallet={user} />
            ))}
        </Stack>
    )
}

function AccordionHeader(props: {
    title: string
    subTitle: string
    isExpanded: boolean
    tokens: TokenEntitlement[]
    qualified?: boolean
    hideNegativeUI: boolean
}) {
    const { title, subTitle, isExpanded, tokens, qualified, hideNegativeUI } = props

    return (
        <Box horizontal gap="sm" justifyContent="spaceBetween">
            <Box grow gap="sm">
                <Stack horizontal alignItems="center" gap="sm">
                    <Text color="default">{title}</Text>
                    {!hideNegativeUI && qualified === false && (
                        <Icon size="square_xs" type="close" color="negative" />
                    )}
                    {qualified === true && <Icon size="square_xs" type="check" color="positive" />}
                </Stack>
                <Text color="gray2" size="sm">
                    {subTitle}
                </Text>
            </Box>
            <Box horizontal gap="xs">
                {tokens.slice(0, 3).map((token) => (
                    <HeaderToken key={token.address} token={token} />
                ))}
                {tokens.length > 3 && (
                    <Box>
                        <Box
                            centerContent
                            background="level4"
                            width="x3"
                            aspectRatio="1/1"
                            rounded="sm"
                        >
                            <Text strong size="sm">
                                +{tokens.length - 3}
                            </Text>
                        </Box>
                    </Box>
                )}
            </Box>
            <MotionIcon
                animate={{
                    rotate: isExpanded ? '0deg' : '-180deg',
                }}
                shrink={false}
                initial={{ rotate: '-180deg' }}
                transition={{ duration: 0.2 }}
                type="arrowDown"
            />
        </Box>
    )
}

function HeaderToken(props: { token: TokenEntitlement }) {
    const { token } = props
    const { data: tokenDataWithChainId } = useTokenMetadataForChainId(token.address, token.chainId)

    return (
        <Box>
            <TokenImage imgSrc={tokenDataWithChainId?.data.imgSrc} width="x3" />
        </Box>
    )
}

function User(props: { wallet: string }) {
    const { wallet } = props
    const { data: userId } = useGetRootKeyFromLinkedWallet({ walletAddress: wallet })
    const user = useUser(userId)
    const name = useMemo(
        () => (user?.displayName ? user.displayName : user?.username ? user.username : wallet),
        [user?.displayName, user?.username, wallet],
    )

    return (
        <>
            <Pill gap="sm" background="level4" color="default">
                {user && <Avatar userId={userId} size="avatar_xs" />}
                {name}
            </Pill>
        </>
    )
}

function useShowToast(props: {
    condition: boolean
    onPostNotification?: () => void
    ToastComponent: React.ElementType<{ resetToast: () => void; toast: Toast }>
}) {
    const { ToastComponent, onPostNotification, condition } = props
    const [toast, setToast] = useState<string | undefined>()

    useEffect(() => {
        const resetToast = () => {
            if (toast) {
                headlessToast.dismiss(toast)
            }
            setToast(undefined)
        }
        if (condition && !toast) {
            const id = popupToast(({ toast: t }) => (
                <ToastComponent resetToast={resetToast} toast={t} />
            ))
            setToast(id)
            onPostNotification?.()
        }
    }, [ToastComponent, condition, onPostNotification, props, props.condition, toast])
}

function useTrackedWallets() {
    const { data: wallets, isLoading: isLoadingWallets } = useLinkedWallets()
    const [trackedWallets, setTrackedWallets] = React.useState<
        | {
              initialWallets: string[]
              newWallets: string[]
          }
        | undefined
    >()
    useEffect(() => {
        if (isLoadingWallets) {
            return
        }
        if (wallets) {
            setTrackedWallets((s) => {
                if (!s?.initialWallets.length) {
                    return {
                        initialWallets: wallets,
                        newWallets: [],
                    }
                } else {
                    return {
                        initialWallets: s.initialWallets,
                        newWallets: wallets,
                    }
                }
            })
        }
    }, [isLoadingWallets, wallets])

    return useMemo(
        () => ({
            initialWallets: trackedWallets?.initialWallets,
            newWallets: trackedWallets?.newWallets,
            allWallets: wallets,
            isLoading: isLoadingWallets,
        }),
        [trackedWallets?.initialWallets, trackedWallets?.newWallets, wallets, isLoadingWallets],
    )
}

function getGeneralEntitlementData({
    role,
    wallets,
}: {
    role: RoleEntitlements
    wallets: string[] | undefined
}) {
    const hasUserEntitlement = role.users.length > 0 && !role.users.includes(EVERYONE_ADDRESS)
    const hasRuleEntitlement = role.ruleData.rules.checkOperations.length > 0
    const tokens = convertRuleDataToTokenFormSchema(
        role.ruleData.kind === 'v2'
            ? role.ruleData.rules
            : convertRuleDataV1ToV2(role.ruleData.rules),
    )
    const tokenTypes = [...new Set(tokens.map((p) => p.type))].join(', ')
    const qualifiesForUserEntitlement =
        hasUserEntitlement && wallets?.some((w) => role.users.includes(w))

    return {
        hasUserEntitlement,
        hasRuleEntitlement,
        tokens,
        tokenTypes,
        qualifiesForUserEntitlement,
    }
}

function qualifiesForRole({
    hasUserEntitlement,
    hasRuleEntitlement,
    qualifiesForUserEntitlement,
    isLoadingTokensInWallet,
    hasMatchingToken,
}: {
    hasUserEntitlement: boolean
    hasRuleEntitlement: boolean
    qualifiesForUserEntitlement: boolean | undefined
    isLoadingTokensInWallet: boolean
    hasMatchingToken: boolean | undefined
}) {
    if (hasUserEntitlement && hasRuleEntitlement) {
        if (isLoadingTokensInWallet) {
            return
        }
        return qualifiesForUserEntitlement && hasMatchingToken === true
    } else if (hasUserEntitlement) {
        return qualifiesForUserEntitlement
    } else if (hasRuleEntitlement) {
        if (isLoadingTokensInWallet) {
            return
        }
        return hasMatchingToken === true
    }
}
