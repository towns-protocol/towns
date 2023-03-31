import React, { useEffect, useRef, useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { AnimatePresence, motion } from 'framer-motion'
import { Box, Button, Heading, Icon, Paragraph, Stack, Text } from '@ui'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { AccordionGroup, AccordionGroupProps } from 'ui/components/Accordion/Accordion'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import {
    SettingsTransactionStatus,
    useSettingsTransactionsStore,
} from '../store/hooks/settingsTransactionStore'
import { MotionNotification, notificationMotion } from './Notification'
import {
    TRANSACTION_HIDDEN_BUTTON,
    TransactionHookInstance,
} from '../TransactionHookInstances/TransactionHookInstances'
import { ModifiedRole, ModifiedRoleType } from '../store/hooks/useModifiedRoles'

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
                    <SavePopup
                        roles={modifiedRoles}
                        preventCloseMessage={preventCloseMessage}
                        onCancel={onHidePopup}
                    />
                </ModalContainer>
            ) : null}
        </>
    )
}

const SavePopup = (props: {
    onCancel: () => void
    roles: ModifiedRole[]
    preventCloseMessage: string
}) => {
    const { onCancel, roles, preventCloseMessage } = props
    const spaceId = useSpaceIdFromPathname()
    const onSave = useEvent(() => {
        const transactionButtons: NodeListOf<HTMLButtonElement> = document.querySelectorAll(
            `.${TRANSACTION_HIDDEN_BUTTON}`,
        )
        transactionButtons.forEach((button) => button.click())
    })
    const inProgressTransactions = useSettingsTransactionsStore(
        (state) => state.inProgressTransactions,
    )
    const hasInProgressTransactions = Object.keys(inProgressTransactions).length > 0

    const rolesToAccordionContent: AccordionGroupProps['accordions'] = roles.map((role) => {
        const [, transactionData] =
            Object.entries(inProgressTransactions).find(
                ([, data]) => data.changeData.metadata.id === role.metadata.id,
            ) ?? []

        return {
            id: role.metadata.id + role.metadata.name,
            header: ({ isExpanded }) => (
                <AccordionHeader
                    isExpanded={isExpanded}
                    subTitle={role.metadata.name}
                    title={getTransactionLabel(role.type)}
                    transactionData={transactionData}
                />
            ),
            children: <TransactionDetail role={role} transactionData={transactionData} />,
        }
    })

    return (
        <Stack gap="lg">
            <Heading level={3}>Confirm your changes</Heading>
            <Stack gap="sm">
                {spaceId &&
                    props.roles.map((role) => (
                        <TransactionHookInstance
                            key={role.metadata.id + role.metadata.name}
                            role={role}
                            spaceId={spaceId}
                        />
                    ))}
                <AccordionGroup accordions={rolesToAccordionContent} />
            </Stack>
            {preventCloseMessage ? (
                <>
                    <Text textAlign="center" color="negative">
                        {preventCloseMessage}
                    </Text>
                </>
            ) : null}
            <Stack horizontal gap justifyContent="end">
                <Button
                    tone="level2"
                    value="Cancel"
                    disabled={hasInProgressTransactions}
                    onClick={onCancel}
                >
                    Cancel
                </Button>
                <Button
                    icon="wallet"
                    tone="cta1"
                    value="Save"
                    disabled={hasInProgressTransactions}
                    onClick={onSave}
                >
                    {hasInProgressTransactions ? <ButtonSpinner /> : 'Save on chain'}
                </Button>
            </Stack>
        </Stack>
    )
}

const MotionIcon = motion(Icon)

const AccordionHeader = ({
    title,
    subTitle,
    isExpanded,
    transactionData,
}: {
    title?: string
    subTitle?: string
    isExpanded?: boolean
    transactionData: SettingsTransactionStatus | undefined
}) => {
    return (
        <Box horizontal justifyContent="spaceBetween">
            <Box gap="sm">
                {title && (
                    <Box horizontal centerContent gap="sm">
                        {transactionData?.status === 'failed' && (
                            <Icon color="error" size="square_xs" type="alert" />
                        )}
                        {transactionData?.status === 'pending' && <ButtonSpinner />}
                        {transactionData?.status === 'success' && (
                            <Icon size="square_xs" color="positive" type="check" />
                        )}
                        <Text color="gray1">{title}</Text>
                    </Box>
                )}
                {subTitle && <Text color="gray2">{subTitle}</Text>}
            </Box>
            <MotionIcon
                animate={{
                    rotate: isExpanded ? '0deg' : '-180deg',
                }}
                transition={{ duration: 0.2 }}
                type="arrowDown"
            />
        </Box>
    )
}

const TransactionDetail = ({
    role,
    transactionData,
}: {
    role: ModifiedRole
    transactionData: SettingsTransactionStatus | undefined
}) => {
    // TODO: determine what we want to do if a user wants to dismiss the changes for a role (before transaction)
    // const resetRole = settingsRolesStore((state) => state.resetRole)
    // const removePotentialTransaction = useSettingsTransactionsStore(
    //     (state) => state.removePotentialTransaction,
    // )
    // const onDismiss = useEvent(() => {
    //     resetRole(role.metadata.id)
    //     removePotentialTransaction(role.metadata.id)
    // })
    return (
        <Stack>
            <Box gap="sm" color="gray2" paddingLeft="lg" as="ul" style={{ listStyleType: 'disc' }}>
                {role.changes
                    .filter((change) => change.shouldDisplay)
                    .map((change) => (
                        <li key={role.metadata.name + role.type + change.title}>
                            <Box color="default">{change.title}</Box>
                            <Box color="gray2">{change.description}</Box>
                        </li>
                    ))}
                {/* {!transactionData && (
                    <Box horizontal paddingTop="md">
                        <Button size="inline" tone="none" onClick={onDismiss}>
                            <Text size="sm" color="error">
                                Dismiss changes for this role
                            </Text>
                        </Button>
                    </Box>
                )} */}
            </Box>
        </Stack>
    )
}

function getTransactionLabel(params: ModifiedRoleType) {
    switch (params) {
        case 'CreateRole':
            return 'New role created'
        case 'UpdateRole':
            return 'Role updated'
        case 'DeleteRole':
            return 'Role deleted'
        default:
            return ''
    }
}
