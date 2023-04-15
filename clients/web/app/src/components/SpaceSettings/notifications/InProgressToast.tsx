import React, { useEffect, useRef, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { AnimatePresence, motion } from 'framer-motion'
import { Button, Paragraph, Stack } from '@ui'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { useSettingsTransactionsStore } from '../store/hooks/settingsTransactionStore'
import { MotionNotification, notificationMotion } from './Notification'

import { ModifiedRole } from '../store/hooks/useModifiedRoles'
import { CheckoutModal } from '../RoleSettings/CheckoutModal'

export const InProgressToast = (props: { modifiedRoles: ModifiedRole[] }) => {
    const { modifiedRoles } = props
    const [showSavePopup, setShowSavePopup] = useState(false)
    const inProgressTransactions = useSettingsTransactionsStore(
        (state) => state.inProgressTransactions,
    )
    const hasInProgressTransactions = Object.keys(inProgressTransactions).length > 0
    const madeATransaction = useRef(false)

    if (Object.keys(inProgressTransactions).length) {
        madeATransaction.current = true
    }

    const [preventCloseMessage, setPreventCloseMessage] = useState('')

    const onSave = useEvent(() => {
        setShowSavePopup(true)
    })
    // prevent closing the modal while transactions are pending
    const onHidePopup = useEvent(() => {
        if (Object.values(inProgressTransactions).some((data) => data.status === 'potential')) {
            setPreventCloseMessage('Please confirm the changes in your wallet to continue.')
            return
        } else if (hasInProgressTransactions) {
            return
        }
        setPreventCloseMessage('')
        setShowSavePopup(false)
    })

    // watch transactions and close the modal when they're all completed
    useEffect(() => {
        // user has not proceeded with any transaction. Don't close yet
        if (!madeATransaction.current) {
            return
        }
        if (Object.keys(inProgressTransactions).length > 0) {
            setPreventCloseMessage('')
        } else {
            setShowSavePopup(false)
        }
    }, [inProgressTransactions])

    return (
        <>
            <Stack position="absolute" bottom="md" left="md" right="md">
                <AnimatePresence>
                    {!!modifiedRoles.length && (
                        <motion.div {...notificationMotion}>
                            <MotionNotification>
                                <Paragraph color={hasInProgressTransactions ? 'negative' : 'cta1'}>
                                    You have{' '}
                                    {hasInProgressTransactions
                                        ? 'changes in progress'
                                        : 'unsaved changes'}
                                </Paragraph>
                                <Button
                                    tone="cta1"
                                    icon={hasInProgressTransactions ? undefined : 'wallet'}
                                    value="Save on chain"
                                    onClick={onSave}
                                >
                                    {hasInProgressTransactions ? 'View Changes' : 'Save on chain'}
                                </Button>
                                {/* <Paragraph color="gray2">
                                    Last saved by{' '}
                                    <span className={atoms({ color: 'default' })}>tak.eth</span>
                                </Paragraph> */}
                            </MotionNotification>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Stack>
            {showSavePopup ? (
                <ModalContainer onHide={onHidePopup}>
                    <CheckoutModal
                        roles={modifiedRoles}
                        preventCloseMessage={preventCloseMessage}
                        onCancel={onHidePopup}
                    />
                </ModalContainer>
            ) : null}
        </>
    )
}
