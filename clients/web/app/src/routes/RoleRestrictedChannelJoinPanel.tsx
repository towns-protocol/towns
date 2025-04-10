import React, { useEffect, useRef, useState } from 'react'
import {
    BlockchainTransactionType,
    EVERYONE_ADDRESS,
    Permission,
    RoleEntitlements,
    useChannelSettings,
    useConnectivity,
    useHasPermission,
    useIsTransactionPending,
    useLinkEOAToRootKeyTransaction,
    useSpaceData,
} from 'use-towns-client'
import headlessToast, { Toast } from 'react-hot-toast/headless'
import { Panel } from '@components/Panel/Panel'
import { Box, Button, Icon, Stack, Text } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'

import { popupToast } from '@components/Notifications/popupToast'
import { StandardToast } from '@components/Notifications/StandardToast'
import { mapToErrorMessage } from '@components/Web3/utils'
import { Analytics } from 'hooks/useAnalytics'
import { ConnectWalletThenLinkButton } from '@components/Web3/ConnectWallet/ConnectWalletThenLinkButton'
import { WalletLinkingInfo } from '@components/Web3/WalletLinkingInfo'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { EntitlementsDisplay } from '@components/TownPageLayout/EntitlementsDisplay'
import { useEntitlements } from 'hooks/useEntitlements'
import { RequirementsModal } from '@components/Modals/RequirementsModal'
import { usePanelActions } from './layouts/hooks/usePanelActions'
import { useOnJoinChannel } from './AllChannelsList/AllChannelsList'

export const RoleRestrictedChannelJoinPanel = React.memo(() => {
    return <RoleRestrictedChannelJoinPanelWithoutAuth />
})

function RoleRestrictedChannelJoinPanelWithoutAuth() {
    const { data: channelId } = usePanelActions()

    const spaceSlug = useSpaceIdFromPathname()

    const tracked = useRef(false)

    const { channelSettings, isLoading } = useChannelSettings(spaceSlug ?? '', channelId ?? '')

    const roles = channelSettings?.roles

    useEffect(() => {
        if (tracked.current) {
            return
        }
        tracked.current = true
        Analytics.getInstance().page(
            'requirements-modal',
            'viewed gated channel requirements panel',
            {
                spaceId: spaceSlug,
                channelId,
            },
        )
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

            if (e?.message?.includes('Sanctions List')) {
                popupToast(({ toast: t }) => (
                    <StandardToast.Error
                        message="Cannot link this wallet"
                        subMessage="This wallet has been blocked by OFAC's Sanctions List"
                        toast={t}
                    />
                ))
                return
            }

            console.error('Error linking wallet to root key', e)
            popupToast(({ toast: t }) => (
                <StandardToast.Error
                    message="There was an error linking your wallet."
                    subMessage={mapToErrorMessage({
                        error: e,
                        source: 'restricted join channel panel',
                    })}
                    toast={t}
                />
            ))
        },
    })

    const isWalletLinkingPending = useIsTransactionPending(BlockchainTransactionType.LinkWallet)

    return (
        <>
            <ChannelsRolesList
                roles={roles}
                spaceId={spaceId}
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

                <ConnectWalletThenLinkButton
                    tone={syncingSpace || isWalletLinkingPending ? 'level2' : 'cta1'}
                    disabled={syncingSpace || isWalletLinkingPending}
                    onLinkWallet={linkEOAToRootKeyTransaction}
                />

                <WalletLinkingInfo />
            </Stack>
        </>
    )
}

export function ChannelsRolesList(props: {
    roles: RoleEntitlements[]
    spaceId: string | undefined
    headerSubtitle?: (role: RoleEntitlements) => JSX.Element | string
    canJoin: boolean | undefined
    isLoadingCanJoin: boolean
    onEditRolePermissions?: (roleId: number) => void
}) {
    const { roles, spaceId, headerSubtitle, canJoin, onEditRolePermissions } = props
    const [selectedRole, setSelectedRole] = useState<RoleEntitlements | null>(null)

    return (
        <>
            {roles.map((role) => {
                const isEveryonePermission = role.users.includes(EVERYONE_ADDRESS)
                return (
                    <Box
                        key={role.roleId}
                        background="level2"
                        border="faint"
                        padding="md"
                        cursor={isEveryonePermission ? 'default' : 'pointer'}
                        rounded="sm"
                        onClick={() => {
                            if (isEveryonePermission) {
                                return
                            }
                            setSelectedRole(role)
                        }}
                    >
                        <RoleHeader
                            roleId={role.roleId}
                            spaceId={spaceId}
                            title={role.name}
                            subTitle={headerSubtitle?.(role) ?? ''}
                            qualified={canJoin}
                            onEditPermissions={onEditRolePermissions}
                        />
                    </Box>
                )
            })}

            {selectedRole && (
                <RoleRequirementsModal
                    spaceId={spaceId}
                    role={selectedRole}
                    onClose={() => setSelectedRole(null)}
                />
            )}
        </>
    )
}

function RoleHeader(props: {
    roleId: number
    spaceId: string | undefined
    title: string
    subTitle: JSX.Element | string
    qualified?: boolean
    onEditPermissions?: (roleId: number) => void
}) {
    const { onEditPermissions, qualified, roleId, subTitle, title, spaceId } = props

    const { data: entitlements } = useEntitlements(spaceId, roleId)

    return (
        <Box horizontal gap="sm" justifyContent="spaceBetween">
            <Box grow gap="sm">
                <Stack horizontal alignItems="center" gap="xs" alignContent="center">
                    <Text color="default">{title}</Text>
                    {qualified === false && (
                        <Icon
                            size="square_xs"
                            type="close"
                            color="negative"
                            style={{ paddingTop: '2px' }}
                        />
                    )}
                </Stack>
                <Text color="gray2" size="sm">
                    {subTitle}
                </Text>
                {!!onEditPermissions && (
                    <Box cursor="pointer" onClick={() => onEditPermissions(roleId)}>
                        <Text color="cta2" size="sm">
                            Change Permissions
                        </Text>
                    </Box>
                )}
            </Box>
            <Box alignSelf="center">
                <EntitlementsDisplay entitlements={entitlements} />
            </Box>
        </Box>
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

export function RoleRequirementsModal({
    role,
    onClose,
    spaceId,
}: {
    role: RoleEntitlements
    onClose: () => void
    spaceId: string | undefined
}) {
    const { data: entitlements } = useEntitlements(spaceId, role.roleId)

    return (
        <RequirementsModal
            title={`Requirements for ${role.name}`}
            spaceId={spaceId}
            entitlements={entitlements}
            onClose={onClose}
        />
    )
}
