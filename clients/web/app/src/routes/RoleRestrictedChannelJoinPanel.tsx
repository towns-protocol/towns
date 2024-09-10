import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router'
import {
    Address,
    BlockchainTransactionType,
    EVERYONE_ADDRESS,
    Permission,
    RoleEntitlements,
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
import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { mapToErrorMessage } from '@components/Web3/utils'
import { Analytics } from 'hooks/useAnalytics'
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
    const tracked = useRef(false)

    const { channelSettings, isLoading } = useChannelSettings(spaceSlug ?? '', channelId ?? '')

    const roles = channelSettings?.roles

    useEffect(() => {
        if (tracked.current) {
            return
        }
        tracked.current = true
        Analytics.getInstance().track('view gated channel requirements panel', {
            spaceId: spaceSlug,
            channelId,
        })
    }, [spaceSlug, channelId])

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
        isLoading: isLoadingCanJoinChannel,
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

    const LINK_LABEL = 'link wallet from gated channel panel'
    const GRANTED_LABEL = 'linked wallet granted access to channel'
    const trackEvent = (description: string, success: boolean) => {
        Analytics.getInstance().track(description, {
            spaceId,
            channelId,
            success,
        })
    }

    const { linkEOAToRootKeyTransaction } = useLinkEOAToRootKeyTransaction({
        onSuccess: async () => {
            trackEvent(LINK_LABEL, true)
            if (!channelId || !loggedInWalletAddress) {
                return
            }
            await invalidateJoinChannel()
            const canJoin = getJoinChannelQueryData()

            if (canJoin) {
                trackEvent(GRANTED_LABEL, true)
                headlessToast.dismiss()
                popupToast(({ toast: t }) => (
                    <StandardToast.Success
                        message={`You've been verified and now have access to this channel.`}
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
                trackEvent(GRANTED_LABEL, false)
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
            trackEvent(LINK_LABEL, false)
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
            <ChannelsRolesList
                roles={roles}
                canJoin={canJoinChannel}
                isLoadingCanJoin={isLoadingCanJoinChannel}
            />
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

export function ChannelsRolesList(props: {
    roles: RoleEntitlements[]
    headerSubtitle?: (role: RoleEntitlements) => JSX.Element | string
    canJoin: boolean | undefined
    isLoadingCanJoin: boolean
    onEditRolePermissions?: (roleId: number) => void
}) {
    const { roles, headerSubtitle, canJoin, onEditRolePermissions, isLoadingCanJoin } = props
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
                      canJoin={canJoin}
                      isLoadingCanJoin={isLoadingCanJoin}
                      header={(props) => (
                          <AccordionHeader
                              {...props}
                              roleId={role.roleId}
                              subTitle={headerSubtitle ? headerSubtitle(role) : props.subTitle}
                              qualified={canJoin}
                              onEditPermissions={onEditRolePermissions}
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
    canJoin: boolean | undefined
    isLoadingCanJoin: boolean
    showQualifiedStatus?: boolean
    header: (props: {
        qualified?: boolean
        title: string
        subTitle: string
        isExpanded: boolean
        tokens: TokenEntitlement[]
        role: RoleEntitlements
        canOpen?: boolean
    }) => JSX.Element
}) {
    const { role, wallets, header, canJoin } = props
    const { hasUserEntitlement, hasRuleEntitlement, tokens, tokenTypes } =
        extractRoleEntitlementDetails({ role, wallets })

    const subTitle = useMemo(() => {
        let message = ''
        if (hasUserEntitlement) {
            message += `${role.users.length} member${role.users.length > 1 ? 's' : ''} whitelisted`
        }
        if (hasRuleEntitlement) {
            message += `${tokenTypes} requirements`
        }

        return message
    }, [hasRuleEntitlement, hasUserEntitlement, role.users.length, tokenTypes])

    const canOpen = hasUserEntitlement || hasRuleEntitlement

    return (
        <Accordion
            border="faint"
            background="level2"
            canOpen={canOpen}
            header={({ isExpanded }) =>
                header({
                    qualified: canJoin,
                    title: role.name,
                    subTitle,
                    isExpanded,
                    tokens,
                    role,
                    canOpen,
                })
            }
        >
            <Stack>
                {hasUserEntitlement && <UserList users={role.users} />}
                {hasRuleEntitlement && (
                    <Stack gap="sm">
                        {tokens.length > 1 ? (
                            <Text color="gray2" size="sm">
                                One of the following is required for this role
                            </Text>
                        ) : null}
                        {tokens.map((token) => (
                            <TokenSelectionDisplayWithMetadata
                                wallets={wallets}
                                key={token.address}
                                token={token}
                            />
                        ))}
                    </Stack>
                )}
            </Stack>
        </Accordion>
    )
}

export function TokenSelectionDisplayWithMetadata(props: {
    wallets: string[] | undefined
    token: TokenEntitlement
    passesEntitlement?: boolean | undefined
}) {
    const { token, passesEntitlement } = props
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
            userPassesEntitlement={passesEntitlement}
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
    roleId: number
    title: string
    subTitle: JSX.Element | string
    isExpanded: boolean
    tokens: TokenEntitlement[]
    qualified?: boolean
    canOpen?: boolean
    onEditPermissions?: (roleId: number) => void
}) {
    const { canOpen, isExpanded, onEditPermissions, qualified, roleId, subTitle, title, tokens } =
        props

    return (
        <Box horizontal gap="sm" justifyContent="spaceBetween">
            <Box grow gap="sm">
                <Stack horizontal alignItems="center" gap="sm">
                    <Text color="default">{title}</Text>
                    {qualified === false && <Icon size="square_xs" type="close" color="negative" />}
                </Stack>
                <Text color="gray2" size="sm">
                    {subTitle}
                </Text>
                {!!onEditPermissions && (
                    <Box cursor="pointer" onClick={() => onEditPermissions(roleId)}>
                        <Text color="cta2" size="sm">
                            Change permissions
                        </Text>
                    </Box>
                )}
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
            {!!canOpen && (
                <MotionIcon
                    animate={{
                        rotate: isExpanded ? '0deg' : '-180deg',
                    }}
                    shrink={false}
                    initial={{ rotate: '-180deg' }}
                    transition={{ duration: 0.2 }}
                    type="arrowDown"
                />
            )}
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

function extractRoleEntitlementDetails({
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
    const tokenTypes = [...new Set(tokens.map((p) => p.type))].join(', or')
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
