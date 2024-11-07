import React, { useCallback, useState } from 'react'
import {
    BlockchainTransactionType,
    TransactionStatus,
    useIsTransactionPending,
    useUpdateChannelTransaction,
} from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import { createPrivyNotAuthenticatedNotification } from '@components/Notifications/utils'
import { PanelButton } from '@components/Panel/PanelButton'
import { Box, Button, Icon, Paragraph } from '@ui'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { GetSigner, WalletReady } from 'privy/WalletReady'

export const DeleteChannelButton = (props: { spaceId: string; channelId: string }) => {
    const { spaceId, channelId } = props
    const { closePanel } = usePanelActions()
    const hasPendingTx = useIsTransactionPending(BlockchainTransactionType.DeleteChannel)
    const { updateChannelTransaction } = useUpdateChannelTransaction()

    const isDisabled = hasPendingTx

    const [isPromptShowing, setIsPromptShowing] = useState(false)
    const showPrompt = useEvent(() => {
        setIsPromptShowing(true)
    })
    const hidePrompt = useEvent(() => {
        setIsPromptShowing(false)
    })

    const onSubmit = useCallback(
        async (getSigner: GetSigner) => {
            if (hasPendingTx) {
                return
            }

            const signer = await getSigner()
            if (!signer) {
                createPrivyNotAuthenticatedNotification()
                return
            }

            setIsPromptShowing(false)

            const txResult = await updateChannelTransaction(
                {
                    parentSpaceId: spaceId,
                    channelId,
                    disabled: true,
                },
                signer,
                BlockchainTransactionType.DeleteChannel,
            )

            if (txResult?.status === TransactionStatus.Success) {
                closePanel({ preventPopStack: false })
            }
        },
        [channelId, closePanel, hasPendingTx, spaceId, updateChannelTransaction],
    )

    return (
        <>
            <PanelButton
                tone="negative"
                label="Disable Channel"
                disabled={isDisabled}
                onClick={showPrompt}
            >
                <Icon type="delete" size="square_xs" />
                <Paragraph>Disable Channel</Paragraph>
            </PanelButton>
            {isPromptShowing && (
                <ModalContainer minWidth="auto" maxWidth="420" onHide={hidePrompt}>
                    <Box padding="sm" gap="lg">
                        <Paragraph size="lg" fontWeight="medium" maxWidth="300">
                            Are you sure you want to disable this channel from the town?
                        </Paragraph>
                        <Paragraph maxWidth="400" color="gray1">
                            When you disable a channel, it means no one will be able to access it
                            again. You won’t be able to undo this.
                        </Paragraph>
                        <Box horizontal gap justifyContent="end">
                            <Button tone="level2" onClick={hidePrompt}>
                                Cancel
                            </Button>
                            <WalletReady>
                                {({ getSigner }) => (
                                    <Button
                                        tone="negative"
                                        color="default"
                                        onClick={() => onSubmit(getSigner)}
                                    >
                                        Disable
                                    </Button>
                                )}
                            </WalletReady>
                        </Box>
                    </Box>
                </ModalContainer>
            )}
        </>
    )
}
