import React from 'react'
import { Button, MotionStack, Stack } from '@ui'
import { useStore } from 'store/store'
import { TransactionButton } from '@components/TransactionButton'
import { TransactionUIState } from 'hooks/TransactionUIState'

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
    const theme = useStore((state) => state.theme)
    return (
        <>
            <Stack
                centerContent
                width="100%"
                borderTop="level4"
                paddingX="lg"
                background={theme === 'dark' ? 'transparentDark' : 'transparentBright'}
            >
                <Stack width="100%" maxWidth="1200" position="relative">
                    <Stack
                        width="100%"
                        maxWidth="500"
                        alignSelf={{
                            desktop: 'end',
                            mobile: 'center',
                        }}
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
                        {panelStatus && transactionUIState ? (
                            <MotionStack
                                width="100%"
                                maxWidth="500"
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
                                    disabled={disabled}
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
                                disabled={disabled}
                                type="button"
                                onClick={onClick}
                            >
                                {text}
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </Stack>
        </>
    )
}
