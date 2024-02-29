import React from 'react'
import { AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import { usePrivy } from '@privy-io/react-auth'
import { Button, MotionBox, Text } from '@ui'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { buttonStyle } from 'ui/components/Button'
import { TransactionUIState } from 'hooks/TransactionUIState'
import * as styles from './TransactionButton.css'

type Props = {
    idleText?: string
    signingText?: string
    transactingText?: string
    successText: string
    formId?: string
    transactionState: TransactionUIState
    disabled?: boolean
    className?: string
    type?: 'submit' | 'button'
    onClick?: () => void
}

export const TransactionButton = (props: Props) => {
    const {
        type = 'submit',
        transactionState,
        transactingText,
        signingText = 'Waiting for Wallet',
        successText,
        formId,
        disabled,
        className,
        idleText,
        onClick,
    } = props

    const { ready: privyReady } = usePrivy()

    const progressBarVisible = transactionState != TransactionUIState.None
    const width: string = (() => {
        switch (transactionState) {
            case TransactionUIState.None:
                return '0%'
            case TransactionUIState.Pending:
                return '30%'
            case TransactionUIState.PendingWithData:
                return '60%'
            case TransactionUIState.Success:
                return '100%'
        }
    })()

    const buttonText = (() => {
        switch (transactionState) {
            case TransactionUIState.Success:
                return successText
            case TransactionUIState.Pending:
                return signingText
            case TransactionUIState.PendingWithData:
                return transactingText
            case TransactionUIState.None:
                return idleText
        }
    })()

    const progressDurationTime: number = (() => {
        switch (transactionState) {
            case TransactionUIState.Success:
                return 1
            default:
                return 2
        }
    })()

    return (
        <MotionBox>
            <AnimatePresence mode="wait">
                {!progressBarVisible && (
                    <MotionBox
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                    >
                        <Button
                            data-testid="create-space-next-button"
                            tone="cta1"
                            form={formId}
                            className={clsx([
                                className,
                                buttonStyle(),
                                styles.relativePositionButton,
                            ])}
                            disabled={
                                !privyReady ||
                                disabled ||
                                transactionState != TransactionUIState.None
                            }
                            style={{
                                opacity:
                                    transactionState !== TransactionUIState.None
                                        ? 1
                                        : !privyReady || disabled
                                        ? 0.5
                                        : 1,
                                zIndex: 1,
                            }}
                            type={type}
                            onClick={onClick}
                        >
                            {idleText}
                        </Button>
                    </MotionBox>
                )}

                {progressBarVisible && (
                    <MotionBox
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        initial={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Button
                            disabled
                            form={formId}
                            tone="level2"
                            className={clsx([
                                className,
                                buttonStyle(),
                                styles.relativePositionButton,
                            ])}
                            type="submit"
                            style={{ opacity: 1, zIndex: 1 }}
                        >
                            <MotionBox
                                border
                                height="100%"
                                initial={{
                                    height: '100%',
                                    width: '0%',
                                    borderRadius: 8,
                                }}
                                animate={{ width: width }}
                                className={clsx(styles.buttonProgressBackground)}
                                transition={{ duration: progressDurationTime }}
                            />
                            <MotionBox
                                horizontal
                                centerContent
                                gap
                                exit={{ opacity: 0 }}
                                layout="position"
                                style={{ zIndex: 2 }}
                            >
                                <ButtonSpinner />
                                <Text>{buttonText}</Text>
                            </MotionBox>
                        </Button>
                    </MotionBox>
                )}
            </AnimatePresence>
        </MotionBox>
    )
}
