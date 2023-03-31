import React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { Box, Button, Text } from '@ui'
import { TransactionUIStatesType } from 'hooks/useTransactionStatus'
import { FadeIn } from '@components/Transitions'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'
import { buttonStyle } from 'ui/components/Button'

type Props = {
    requestingText?: string
    transactingText?: string
    children: React.ReactNode
    formId?: string
    transactionUIState: TransactionUIStatesType
    disabled?: boolean
    className?: string
}

const MotionText = motion(Text)

export const TransactionButton = (props: Props) => {
    const {
        transactionUIState,
        transactingText = 'Creating Town',
        requestingText = 'Waiting for Approval',
        formId,
        disabled,
        className,
    } = props

    const { isAbleToInteract, isRequesting, isSuccess } = transactionUIState
    return (
        <Button
            animate
            data-testid="create-space-next-button"
            tone={!isAbleToInteract || isSuccess ? 'level2' : 'cta1'}
            disabled={disabled || !isAbleToInteract}
            style={{ opacity: !isAbleToInteract ? 1 : disabled ? 0.5 : 1, zIndex: 1 }}
            type="submit"
            form={formId}
            className={clsx([className, buttonStyle()])}
        >
            {/* broken up b/c of weird behavior with framer layout warping text */}
            {!isAbleToInteract && (
                <FadeIn delay>
                    <Box horizontal gap="sm">
                        <ButtonSpinner />
                        {isRequesting && <MotionText layout>{requestingText}</MotionText>}
                        {!isRequesting && <MotionText layout>{transactingText}</MotionText>}
                    </Box>
                </FadeIn>
            )}

            {isAbleToInteract && <FadeIn delay>{props.children}</FadeIn>}
        </Button>
    )
}
