import React from 'react'
import { useCurrentWalletEqualsSignedInAccount } from 'use-zion-client'
import { Box, Button, MotionStack, Stack } from '@ui'
import { useStore } from 'store/store'
import { TransactionButton } from '@components/TransactionButton'
import { TransactionUIState } from 'hooks/TransactionUIState'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'
import { ErrorMessageText } from 'ui/components/ErrorMessage/ErrorMessage'

type Props = {
    onClick?: () => void
    text: string
    disabled?: boolean
    panelStatus?: 'open' | 'closed'
    transactionUIState?: TransactionUIState
    transactingText?: string
    successText?: string
    idleText?: string
}

export function BottomBar({
    onClick,
    text,
    disabled,
    panelStatus,
    transactionUIState,
    transactingText,
    successText,
    idleText,
}: Props) {
    const { isTransactionNetwork, switchNetwork } = useRequireTransactionNetwork()
    const currentWalletEqualsSignedInAccount = useCurrentWalletEqualsSignedInAccount()
    const isDisabled = !isTransactionNetwork || !currentWalletEqualsSignedInAccount || disabled

    return (
        <>
            <BottomBarLayout
                messageContent={
                    <>
                        {!isTransactionNetwork && (
                            <Box paddingTop="md" flexDirection="row" justifyContent="end">
                                <RequireTransactionNetworkMessage
                                    postCta="to create a town."
                                    switchNetwork={switchNetwork}
                                />
                            </Box>
                        )}
                        {isTransactionNetwork && !currentWalletEqualsSignedInAccount && (
                            <Box paddingTop="md" flexDirection="row" justifyContent="end">
                                <ErrorMessageText message="Wallet is not connected, or is not the same as the signed in account." />
                            </Box>
                        )}
                    </>
                }
                buttonContent={
                    <>
                        {panelStatus && transactionUIState ? (
                            <MotionStack
                                width="100%"
                                maxWidth="300"
                                position="absolute"
                                animate={{
                                    left: panelStatus === 'open' ? '0px' : 'unset',
                                }}
                                transition={{
                                    type: 'easeInOut',
                                    duration: 0.2,
                                }}
                            >
                                <TransactionButton
                                    disabled={isDisabled}
                                    transactionState={transactionUIState}
                                    transactingText={transactingText}
                                    successText={successText ?? ''}
                                    idleText={text}
                                    type="button"
                                    onClick={onClick}
                                />
                            </MotionStack>
                        ) : (
                            <Button
                                tone="cta1"
                                width="100%"
                                disabled={isDisabled}
                                type="button"
                                onClick={onClick}
                            >
                                {text}
                            </Button>
                        )}
                    </>
                }
            />
        </>
    )
}

export const BottomBarLayout = (props: {
    messageContent?: React.ReactNode
    buttonContent?: React.ReactNode
}) => {
    const theme = useStore((state) => state.theme)
    return (
        <Stack
            centerContent
            width="100%"
            borderTop="default"
            paddingX="lg"
            background={theme === 'dark' ? 'transparentDark' : 'transparentBright'}
        >
            <Stack
                direction={{ default: 'row', mobile: 'column' }}
                width="100%"
                maxWidth="1200"
                position="relative"
            >
                <Box grow>{props.messageContent}</Box>
                {props.buttonContent && (
                    <Stack
                        minWidth={{ desktop: '300', mobile: undefined }}
                        paddingY={{
                            mobile: 'md',
                            desktop: 'lg',
                        }}
                        height={{
                            desktop: 'x12',
                            mobile: 'x10',
                        }}
                        paddingX={{
                            mobile: 'sm',
                        }}
                    >
                        {props.buttonContent}
                    </Stack>
                )}
            </Stack>
        </Stack>
    )
}
