import React, { useCallback, useState } from 'react'
import { BlockchainTransactionType, LookupUser, useIsTransactionPending } from 'use-towns-client'
import { ShortcutTooltip } from '@components/Shortcuts/ShortcutTooltip'
import { Box, CardOpener, CardOpenerTriggerProps, IconButton } from '@ui'
import { useShortcut } from 'hooks/useShortcut'
import { useCardOpenerContext } from 'ui/components/Overlay/CardOpenerContext'
import { TipMenu } from './TipMenu'
import { TipOption } from './types'
import { TipConfirm } from './TipConfirm'

export function TipTooltipPopup(props: {
    wrapperRef: React.RefObject<HTMLDivElement>
    senderUser: LookupUser
    eventId: string
}) {
    const { wrapperRef, senderUser, eventId } = props
    const [isAbove, setIsAbove] = useState(false)
    const [tipValue, setTipValue] = useState<TipOption | undefined>()
    const tipPending = useIsTransactionPending(BlockchainTransactionType.Tip)
    return (
        <Box
            tooltip={<ShortcutTooltip action="TipMessage" />}
            tooltipOptions={{ removeOnClick: true, disabled: !!tipValue }}
        >
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
                    >
                        <TipMenu
                            tipValue={tipValue}
                            setTipValue={setTipValue}
                            confirmRenderer={
                                <TipConfirmWithCardContext
                                    tipValue={tipValue}
                                    setTipValue={setTipValue}
                                    senderUser={senderUser}
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
                    return <TipIcoButton tipPending={tipPending} triggerProps={triggerProps} />
                }}
            </CardOpener>
        </Box>
    )
}

function TipConfirmWithCardContext(props: {
    tipValue: TipOption | undefined
    setTipValue: (tipValue: TipOption | undefined) => void
    senderUser: LookupUser
    eventId: string
}) {
    const { tipValue, setTipValue, senderUser, eventId } = props
    const { closeCard } = useCardOpenerContext()

    return (
        <TipConfirm
            tipValue={tipValue}
            setTipValue={setTipValue}
            senderUser={senderUser}
            eventId={eventId}
            onTip={closeCard}
        />
    )
}

function TipIcoButton(props: { tipPending: boolean; triggerProps: CardOpenerTriggerProps }) {
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
