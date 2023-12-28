import React from 'react'
import { useCurrentWalletEqualsSignedInAccount } from 'use-zion-client'
import { useEvent } from 'react-use-event-hook'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'
import { Box, Button, Heading, Icon, MotionIcon, Stack, Text } from '@ui'
import { AccordionGroup, AccordionGroupProps } from 'ui/components/Accordion/Accordion'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'
import { TRANSACTION_HIDDEN_BUTTON, TransactionHookInstance } from './TransactionHookInstances'
import {
    SettingsTransactionStatus,
    useSettingsTransactionsStore,
} from '../store/hooks/settingsTransactionStore'
import { ModifiedRole, ModifiedRoleType } from '../store/hooks/useModifiedRoles'

export const CheckoutModal = (props: {
    onCancel: () => void
    roles: ModifiedRole[]
    preventCloseMessage: string
}) => {
    const { onCancel, roles, preventCloseMessage } = props
    const spaceId = useSpaceIdFromPathname()
    const currentWalletEqualsSignedInAccount = useCurrentWalletEqualsSignedInAccount()

    // when the user clicks the main save button in the modal, it will trigger the hidden button within each TransactionHookInstance
    // Alternatively, we could track each potential transaction callbacks in an array, and call them all here. But seems unessarily complicated and more room for bugs
    // Another alternative to avoid .querySelectorAll is storing an array of refs and attaching to each hidden button - again, the current approach just seems simpler
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

    const { isTransactionNetwork, switchNetwork } = useRequireTransactionNetwork()

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
        <Stack gap="lg" maxWidth="600" data-testid="role-settings-checkout-modal">
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
                    data-testid="role-settings-checkout-modal-save-button"
                    icon="wallet"
                    tone="cta1"
                    value="Save"
                    disabled={
                        hasInProgressTransactions ||
                        !isTransactionNetwork ||
                        !currentWalletEqualsSignedInAccount
                    }
                    onClick={onSave}
                >
                    {hasInProgressTransactions ? <ButtonSpinner /> : 'Save on chain'}
                </Button>
            </Stack>
            {!isTransactionNetwork && (
                <Box horizontal justifyContent="end">
                    <RequireTransactionNetworkMessage
                        postCta="to make changes."
                        switchNetwork={switchNetwork}
                    />
                </Box>
            )}
            {!currentWalletEqualsSignedInAccount && (
                <Box horizontal justifyContent="end">
                    <Text textAlign="center" color="error">
                        Current wallet does not match the signed in account. Please change your
                        wallet.
                    </Text>
                </Box>
            )}
        </Stack>
    )
}

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
                        {(transactionData?.status === 'pending' ||
                            transactionData?.status === 'potential') && <ButtonSpinner />}
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
