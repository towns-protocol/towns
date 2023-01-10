import React from 'react'
import { motion } from 'framer-motion'
import { Box, Button, Text } from '@ui'
import { TransactionUIStatesType } from 'hooks/useTransactionStatus'
import { FadeIn } from '@components/Transitions'
import { ButtonSpinner } from '@components/Login/LoginButton/Spinner/ButtonSpinner'

type Props = {
    requestingText?: string
    transactingText?: string
    children: React.ReactNode
    formId?: string
    transactionUIState: TransactionUIStatesType
}

const MotionText = motion(Text)

export const TransactionButton = (props: Props) => {
    const {
        transactionUIState,
        transactingText = 'Creating Space',
        requestingText = 'Waiting for Approval',
        formId,
    } = props

    const { isAbleToInteract, isRequesting, isSuccess } = transactionUIState
    return (
        <Button
            data-testid="create-space-next-button"
            tone={!isAbleToInteract || isSuccess ? 'level2' : 'cta1'}
            disabled={!isAbleToInteract}
            style={{ opacity: 1, zIndex: 1 }}
            type="submit"
            form={formId}
        >
            {/* broken up b/c of weird behavior with framer layout warping text */}
            {!isAbleToInteract && (
                <FadeIn delay>
                    <Box flexDirection="row" gap="sm">
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
