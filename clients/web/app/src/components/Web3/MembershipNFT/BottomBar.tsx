import React from 'react'
import { TransactionButton } from '@components/TransactionButton'
import { Box, BoxProps, Button, MotionStack, Stack } from '@ui'
import { TransactionUIState } from 'hooks/TransactionUIState'
import { useDevice } from 'hooks/useDevice'

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
    const isDisabled = disabled

    return (
        <>
            <BottomBarLayout
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

export const BottomBarLayout = ({
    messageContent,
    buttonContent,
    errorReportButton: leftContent,
    ...boxProps
}: {
    errorReportButton?: React.ReactNode
    messageContent?: React.ReactNode
    buttonContent?: React.ReactNode
} & BoxProps) => {
    const { isTouch } = useDevice()
    return (
        <Stack
            centerContent
            width="100%"
            borderTop="default"
            background="backdropBlur"
            paddingX={{ default: 'lg', mobile: 'md' }}
            {...boxProps}
        >
            <Stack
                direction={{ default: 'row', mobile: 'column' }}
                width="100%"
                maxWidth="1200"
                position="relative"
            >
                {buttonContent && !isTouch && <ButtonContainer>{leftContent}</ButtonContainer>}
                <Box grow>{messageContent}</Box>
                {buttonContent && (
                    <ButtonContainer
                        horizontal
                        gap
                        minWidth={{ desktop: '300', mobile: undefined }}
                    >
                        {isTouch && !!leftContent && <Box>{leftContent}</Box>}
                        {buttonContent}
                    </ButtonContainer>
                )}
            </Stack>
        </Stack>
    )
}

const ButtonContainer = (boxProps: BoxProps) => (
    <Stack
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
        {...boxProps}
    />
)
