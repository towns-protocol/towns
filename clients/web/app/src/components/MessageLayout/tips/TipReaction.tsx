import React, { useMemo, useRef, useState } from 'react'
import { LookupUser, MessageTips, useMyUserId, useUserLookupArray } from 'use-towns-client'
import { Box, Icon, Paragraph, Pill, Text, Tooltip } from '@ui'
import { useStore } from 'store/store'
import { atoms } from 'ui/styles/atoms.css'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useEthToUsdFormatted } from '@components/Web3/useEthPrice'
import { useDevice } from 'hooks/useDevice'
import { TipTooltipPopup } from './TipTooltipPopup'
import { TipSheet } from './TipSheet'

const emptyTips: MessageTips = []

export function TipReaction({
    tips,
    eventId,
    messageOwner,
    isTippable,
}: {
    tips?: MessageTips
    eventId: string | undefined
    messageOwner: LookupUser
    isTippable?: boolean
}) {
    const tippers = useTippers(tips ?? emptyTips)
    const theme = useStore((state) => state.getTheme())
    const amount = useTipAmount(tips ?? emptyTips)
    const ref = useRef<HTMLDivElement>(null)
    const color = theme === 'light' ? 'default' : isTippable ? 'inverted' : 'cta1'
    const iconColor = !isTippable ? 'cta1' : undefined
    const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false)
    const { isTouch } = useDevice()

    if (!isTippable && !tippers.length) {
        return null
    }

    return (
        <>
            <Box horizontal position="relative">
                <Box
                    position="absolute"
                    style={{
                        left: '50%',
                        transform: 'translateX(-50%) ',
                    }}
                    width="150"
                    ref={ref}
                />
                {eventId && (
                    <TipTooltipPopup
                        wrapperRef={ref}
                        messageOwner={messageOwner}
                        eventId={eventId}
                        tooltip={<TippingTooltip users={tippers} amount={amount} />}
                        wrapperStyles={(isAbove) => ({
                            justifyContent: isAbove ? 'end' : 'start',
                            paddingBottom: isAbove ? 'sm' : undefined,
                            paddingTop: isAbove ? undefined : 'x4',
                        })}
                    >
                        {({ triggerProps, tipPending }) => {
                            const { onClick: onTriggerClick, ...rest } = triggerProps
                            return (
                                <Pill
                                    horizontal
                                    centerContent
                                    background={isTippable ? 'cta1' : 'level3'}
                                    border={!isTippable ? 'textDefault' : undefined}
                                    position="relative"
                                    rounded="lg"
                                    gap="xs"
                                    color={color}
                                    disabled={tipPending || !isTippable}
                                    onClick={(e) => {
                                        if (tipPending || !isTippable) {
                                            return
                                        }
                                        if (isTouch) {
                                            setIsMobileSheetOpen(true)
                                        } else {
                                            onTriggerClick?.(e)
                                        }
                                    }}
                                    {...rest}
                                    cursor={!isTippable ? 'default' : 'pointer'}
                                >
                                    <Icon color={iconColor} type="dollar" size="square_xs" />
                                    <Text fontWeight="medium" size="sm">
                                        {tippers.length === 0 ? 'Tip' : `${tippers.length}`}
                                    </Text>
                                </Pill>
                            )
                        }}
                    </TipTooltipPopup>
                )}
            </Box>
            {isMobileSheetOpen && eventId && (
                <TipSheet
                    messageOwner={messageOwner}
                    eventId={eventId}
                    onCloseTip={() => setIsMobileSheetOpen(false)}
                />
            )}
        </>
    )
}

function TippingTooltip({ users, amount }: { users: LookupUser[]; amount: string }) {
    const usersForDisplay = users.slice(0, 3)
    const rest = users.slice(3)
    const myUserId = useMyUserId()

    const userTexts = useMemo(() => {
        const userNames = usersForDisplay.map((u, index) => {
            if (u.userId === myUserId) {
                return index === 0 ? 'You' : 'you'
            }
            return getPrettyDisplayName(u)
        })
        if (userNames.length === 0) {
            return ''
        }

        const formatters: Record<number, (users: string[]) => string> = {
            1: ([first]: string[]) => `${first}`,
            2: ([first, second]: string[]) => `${first} and ${second}`,
            3: ([first, second, third]: string[]) => `${first}, ${second} and ${third}`,
        }
        const formatter = formatters[userNames.length]
        if (formatter) {
            return formatter(userNames)
        }

        const otherLength = rest.length
        return `${userNames.join(', ')} and ${otherLength} other${otherLength > 1 ? 's' : ''}`
    }, [usersForDisplay, rest.length, myUserId])

    if (usersForDisplay.length === 0) {
        return null
    }

    return (
        <Tooltip background="level2" rounded="sm">
            <Box width="150" gap="lg">
                <Box />
                <Box centerContent>
                    <Paragraph strong size="lg" textAlign="center" color="default">
                        {amount}
                    </Paragraph>
                </Box>

                <Paragraph size="sm" textAlign="center" color="default">
                    {userTexts}{' '}
                    <span
                        style={{ whiteSpace: 'break-spaces' }}
                        className={atoms({ color: 'gray2' })}
                    >
                        tipped.
                    </span>
                </Paragraph>
            </Box>
        </Tooltip>
    )
}

export function useTipAmount(tips: MessageTips): string {
    const accumulatedAmount = useMemo(
        () =>
            tips.reduce<bigint>((acc, curr) => {
                return acc + (curr.content.tip.event?.amount ?? 0n)
            }, 0n),
        [tips],
    )

    return useEthToUsdFormatted({
        ethAmount: accumulatedAmount,
    })
}

export function useTippers(tips: MessageTips): LookupUser[] {
    const userIds = new Set(tips.map((t) => t.content.fromUserId))
    return useUserLookupArray(Array.from(userIds))
}
