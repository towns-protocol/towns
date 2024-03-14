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
            alignItems="center"
            {...boxProps}
            paddingBottom="safeAreaInsetBottom"
        >
            <Stack
                horizontal
                width="100%"
                maxWidth={isTouch ? '100%' : '1000'}
                position="relative"
                paddingX={isTouch ? 'md' : 'lg'}
                gap="md"
            >
                <Box width="500">
                    {messageContent}
                    {!messageContent && <Box grow />}
                </Box>
                <Box grow />
                {buttonContent && (
                    <ButtonContainer horizontal gap minWidth={isTouch ? undefined : '300'}>
                        {buttonContent}
                    </ButtonContainer>
                )}
            </Stack>
        </Stack>
    )
}

const ButtonContainer = (boxProps: BoxProps) => (
    <Box
        shrink
        centerContent
        height={{
            desktop: 'x12',
            mobile: 'x10',
        }}
        {...boxProps}
    />
)
