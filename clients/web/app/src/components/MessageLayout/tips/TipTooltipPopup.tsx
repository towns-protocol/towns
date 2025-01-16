import React, { useCallback, useState } from 'react'
import {
    BlockchainTransactionType,
    LookupUser,
    useChannelData,
    useIsTransactionPending,
} from 'use-towns-client'
import { isDMChannelStreamId, isGDMChannelStreamId } from '@river-build/sdk'
import { Box, BoxProps, CardOpener, CardOpenerTriggerProps, IconButton } from '@ui'
import { useShortcut } from 'hooks/useShortcut'
import { useCardOpenerContext } from 'ui/components/Overlay/CardOpenerContext'
import { isInputFocused } from '@components/RichTextPlate/utils/helpers'
import { TipMenu } from './TipMenu'
import { TipOption } from './types'
import { TipConfirm } from './TipConfirm'
import { trackTipOnMessage } from './tipAnalytics'

const MODAL_WIDTH = '200px'

export function TipTooltipPopup(props: {
    wrapperRef: React.RefObject<HTMLDivElement>
    messageOwner: LookupUser
    tooltip: React.ReactNode
    eventId: string
    wrapperStyles?: (
        isAbove: boolean,
    ) => Pick<BoxProps, 'justifyContent' | 'paddingBottom' | 'paddingTop'>
    children: (props: {
        triggerProps: CardOpenerTriggerProps
        tipPending: boolean
    }) => React.ReactNode
}) {
    const { wrapperRef, messageOwner, tooltip, eventId, wrapperStyles, children } = props
    const [isAbove, setIsAbove] = useState(false)
    const [tipValue, setTipValue] = useState<TipOption | undefined>()
    const [isOpen, setIsOpen] = useState(false)
    const tipPending = useIsTransactionPending(BlockchainTransactionType.Tip)
    const channelData = useChannelData()
    const channelId = channelData?.channelId
    const isDmOrGDM =
        !!channelId && (isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId))

    console.log('TipTooltipPopup render:', { tipValue, channelId, tipPending, isOpen })

    if (!channelId || isDmOrGDM) {
        return null
    }

    const handleSetTipValue = (value: TipOption | undefined) => {
        console.log('TipTooltipPopup setTipValue called with:', value)
        setTipValue(value)
        if (value) {
            setIsOpen(true)
        }
    }

    const handleClose = () => {
        console.log('CardOpener handleClose called')
        setIsOpen(false)
        setTipValue(undefined)
    }

    const handleSend = () => {
        handleClose()
    }

    const handleCancel = () => {
        handleClose()
    }

    return (
        <Box tooltip={tooltip} tooltipOptions={{ removeOnClick: true, disabled: !!tipValue }}>
            <CardOpener
                placement="dropdown"
                overrideTriggerRef={wrapperRef}
                render={
                    isOpen ? (
                        <Box
                            pointerEvents="auto"
                            style={{
                                width: MODAL_WIDTH,
                            }}
                            justifyContent={isAbove ? 'end' : 'start'}
                            paddingBottom={isAbove ? 'sm' : undefined}
                            paddingTop={isAbove ? undefined : 'sm'}
                            {...wrapperStyles?.(isAbove)}
                        >
                            <TipMenu
                                tipValue={tipValue}
                                setTipValue={handleSetTipValue}
                                confirmRenderer={
                                    tipValue !== undefined ? (
                                        <TipConfirmWithCardContext
                                            tipValue={tipValue}
                                            setTipValue={handleSetTipValue}
                                            messageOwner={messageOwner}
                                            eventId={eventId}
                                            onSend={handleSend}
                                            onCancel={handleCancel}
                                        />
                                    ) : null
                                }
                            />
                        </Box>
                    ) : undefined
                }
                onIsAbove={setIsAbove}
                onClose={handleClose}
            >
                {({ triggerProps }) => {
                    const enhancedTriggerProps = {
                        ...triggerProps,
                        onClick: (e: React.MouseEvent) => {
                            console.log('CardOpener trigger clicked')
                            triggerProps.onClick?.(e)
                            setIsOpen(true)
                        },
                    }
                    return children({ triggerProps: enhancedTriggerProps, tipPending })
                }}
            </CardOpener>
        </Box>
    )
}

export function TipConfirmWithCardContext(props: {
    tipValue: TipOption | undefined
    setTipValue: (tipValue: TipOption | undefined) => void
    messageOwner: LookupUser
    eventId: string
    onSend?: () => void
    onCancel?: () => void
}) {
    const { tipValue, setTipValue, messageOwner, eventId, onSend, onCancel } = props
    const { closeCard } = useCardOpenerContext()

    console.log('TipConfirmWithCardContext render:', { tipValue })

    return (
        <TipConfirm
            tipValue={tipValue}
            setTipValue={setTipValue}
            messageOwner={messageOwner}
            eventId={eventId}
            onTip={() => {
                closeCard()
                onSend?.()
            }}
            onCancel={onCancel}
        />
    )
}

export function TipIcoButton(props: { tipPending: boolean; triggerProps: CardOpenerTriggerProps }) {
    const { tipPending, triggerProps } = props
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { cursor, onClick: onTriggerClick, ...rest } = triggerProps

    const onTip = useShortcut(
        'TipMessage',
        useCallback(() => {
            onTriggerClick?.(
                new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                }) as unknown as React.MouseEvent,
            )
            trackTipOnMessage('messageActions')
        }, [onTriggerClick]),
        { enableOnContentEditable: false, enabled: () => !isInputFocused() },
    )

    return (
        <IconButton
            color="cta1"
            icon="dollar"
            size="square_sm"
            opacity={tipPending ? '0.4' : 'opaque'}
            hoverColor="cta1"
            data-testid="message-tip--button"
            disabled={tipPending}
            cursor={tipPending ? 'not-allowed' : 'pointer'}
            onClick={() => {
                onTip()
            }}
            {...rest}
        />
    )
}
