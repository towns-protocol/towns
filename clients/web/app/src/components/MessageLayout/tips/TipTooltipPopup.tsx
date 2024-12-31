import React, { useCallback, useState } from 'react'
import { BlockchainTransactionType, LookupUser, useIsTransactionPending } from 'use-towns-client'
import { isDMChannelStreamId, isGDMChannelStreamId } from '@river-build/sdk'
import { Box, BoxProps, CardOpener, CardOpenerTriggerProps, IconButton } from '@ui'
import { useShortcut } from 'hooks/useShortcut'
import { useCardOpenerContext } from 'ui/components/Overlay/CardOpenerContext'
import { useChannelIdFromPathname } from 'hooks/useChannelIdFromPathname'
import { TipMenu } from './TipMenu'
import { TipOption } from './types'
import { TipConfirm } from './TipConfirm'
import { trackTipOnMessage } from './tipAnalytics'

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
    const tipPending = useIsTransactionPending(BlockchainTransactionType.Tip)
    const channelId = useChannelIdFromPathname()
    const isDmOrGDM =
        !!channelId && (isDMChannelStreamId(channelId) || isGDMChannelStreamId(channelId))

    if (!channelId || isDmOrGDM) {
        return null
    }

    return (
        <Box tooltip={tooltip} tooltipOptions={{ removeOnClick: true, disabled: !!tipValue }}>
            <CardOpener
                placement="dropdown"
                overrideTriggerRef={wrapperRef}
                render={
                    <Box
                        pointerEvents="none"
                        // set a min height because of the shifting content/height of the tip menu, to ensure the menu doesn't flip flop between above and below button
                        style={{ minHeight: '210px' }}
                        justifyContent={isAbove ? 'end' : 'start'}
                        paddingBottom={isAbove ? 'sm' : undefined}
                        paddingTop={isAbove ? undefined : 'sm'}
                        {...wrapperStyles?.(isAbove)}
                    >
                        <TipMenu
                            tipValue={tipValue}
                            setTipValue={setTipValue}
                            confirmRenderer={
                                <TipConfirmWithCardContext
                                    tipValue={tipValue}
                                    setTipValue={setTipValue}
                                    messageOwner={messageOwner}
                                    eventId={eventId}
                                />
                            }
                        />
                    </Box>
                }
                onIsAbove={setIsAbove}
                onClose={() => {
                    setTipValue(undefined)
                }}
            >
                {({ triggerProps }) => {
                    return children({ triggerProps, tipPending })
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
}) {
    const { tipValue, setTipValue, messageOwner, eventId } = props
    const { closeCard } = useCardOpenerContext()

    return (
        <TipConfirm
            tipValue={tipValue}
            setTipValue={setTipValue}
            messageOwner={messageOwner}
            eventId={eventId}
            onTip={closeCard}
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
