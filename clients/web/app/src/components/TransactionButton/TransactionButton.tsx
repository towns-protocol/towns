import React from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { FancyButton } from 'ui/components/Button'
import { TransactionUIState } from 'hooks/TransactionUIState'

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
    resetToIdleOnSuccess?: boolean
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

    const isProgress = transactionState !== TransactionUIState.None
    const isDisabled = isProgress || !privyReady || disabled

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

    return (
        <FancyButton
            cta={!isDisabled}
            spinner={isProgress}
            disabled={isDisabled}
            form={formId}
            type={type}
            className={className}
            data-testid="create-space-next-button"
            onClick={onClick}
        >
            {isProgress ? idleText : buttonText}
        </FancyButton>
    )
}
