import React, { useCallback } from 'react'
import {
    BlockchainTransactionType,
    useBannedWalletAddresses,
    useIsTransactionPending,
    useSpaceId,
    useUnbanTransaction,
    useUserLookupContext,
} from 'use-towns-client'
import { Panel } from '@components/Panel/Panel'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { Box, Button, Paragraph, Stack } from '@ui'
import { Avatar } from '@components/Avatar/Avatar'
import { useDevice } from 'hooks/useDevice'
import { ProfileHoverCard } from '@components/ProfileHoverCard/ProfileHoverCard'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { ConfirmBanUnbanModal } from '@components/ConfirmBanUnbanModal/ConfirmBanUnbanModal'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'

import { GetSigner } from 'privy/WalletReady'

export const SpaceBannedUsers = React.memo(() => {
    const spaceId = useSpaceId()
    const [selectedUserId, setSelectedUserId] = React.useState<string | undefined>(undefined)
    const [showConfirmModal, setShowConfirmModal] = React.useState(false)

    const { userIds: bannedUserIds, isLoading } = useBannedWalletAddresses(spaceId)
    const { unbanTransaction } = useUnbanTransaction()
    const unbanTransactionPending = useIsTransactionPending(BlockchainTransactionType.UnbanUser)

    const unbanClicked = useCallback(
        (userId: string) => {
            setSelectedUserId(userId)
            setShowConfirmModal(true)
        },
        [setSelectedUserId],
    )

    const onCancelUnban = useCallback(() => {
        setSelectedUserId(undefined)
        setShowConfirmModal(false)
    }, [setSelectedUserId])

    const onConfirmUnban = useCallback(
        (getSigner: GetSigner) => {
            if (!spaceId || !selectedUserId || unbanTransactionPending) {
                return
            }
            async function unban(spaceNetworkId: string, userId: string) {
                const signer = await getSigner()
                if (!signer) {
                    console.error('No signer')
                    createPrivyNotAuthenticatedNotification()
                    return
                }
                await unbanTransaction(signer, spaceNetworkId, userId)
                setSelectedUserId(undefined)
            }
            void unban(spaceId, selectedUserId)
            setShowConfirmModal(false)
        },
        [spaceId, selectedUserId, unbanTransaction, setSelectedUserId, unbanTransactionPending],
    )

    return (
        <Panel label="Banned Users" padding="none">
            {isLoading ? (
                <Box absoluteFill centerContent>
                    <ButtonSpinner />
                </Box>
            ) : (
                <Stack height="100%" paddingX="none">
                    {bannedUserIds?.length ? (
                        bannedUserIds.map((userId) => (
                            <BannedUserRow
                                key={userId}
                                userId={userId}
                                unbanClicked={unbanClicked}
                                transactionInProgress={
                                    unbanTransactionPending && userId === selectedUserId
                                }
                                disabled={unbanTransactionPending}
                            />
                        ))
                    ) : (
                        <Box centerContent height="100%" width="100%">
                            <Paragraph>No banned members</Paragraph>
                        </Box>
                    )}
                </Stack>
            )}
            {selectedUserId && showConfirmModal && (
                <ConfirmBanUnbanModal
                    userId={selectedUserId}
                    ban={false}
                    onCancel={onCancelUnban}
                    onConfirm={onConfirmUnban}
                />
            )}
        </Panel>
    )
})

const BannedUserRow = (props: {
    userId: string
    unbanClicked: (userId: string) => void
    transactionInProgress: boolean
    disabled: boolean
}) => {
    const { userId, unbanClicked, disabled, transactionInProgress } = props
    const { lookupUser } = useUserLookupContext()
    const globalUser = lookupUser(userId)
    const { isTouch } = useDevice()

    return (
        <Stack
            horizontal
            paddingX="md"
            paddingY="sm"
            background={{ hover: 'level3', default: undefined }}
            cursor="pointer"
            alignItems="center"
        >
            <Stack horizontal height="height_lg" gap="md" width="100%" alignItems="center">
                <Box
                    centerContent
                    tooltip={!isTouch ? <ProfileHoverCard userId={userId} /> : undefined}
                >
                    <Avatar userId={userId} size="avatar_x4" />
                </Box>
                <Stack grow gap="paragraph" overflow="hidden">
                    <Paragraph truncate color="default">
                        {getPrettyDisplayName(globalUser)}
                    </Paragraph>
                </Stack>
                {transactionInProgress ? (
                    <ButtonSpinner />
                ) : (
                    <Button
                        tone="level2"
                        size="button_sm"
                        disabled={disabled}
                        onClick={() => unbanClicked(props.userId)}
                    >
                        Unban
                    </Button>
                )}
            </Stack>
        </Stack>
    )
}
