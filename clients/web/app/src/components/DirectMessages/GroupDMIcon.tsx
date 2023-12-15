import React, { useMemo } from 'react'
import { RoomIdentifier, useDMData } from 'use-zion-client'
import { Avatar } from '@components/Avatar/Avatar'
import { LetterStylesVariantProps } from '@components/IconInitials/IconInitials.css'
import { Box, Paragraph } from '@ui'
import { notUndefined } from 'ui/utils/utils'

type Props = {
    roomIdentifier: RoomIdentifier
    letterFontSize?: LetterStylesVariantProps
    width?: 'x3' | 'x4' | 'x6'
}

export type GroupDMIconProps = Props

export const GroupDMIcon = (props: Props) => {
    const { counterParty, data } = useDMData(props.roomIdentifier)
    const userIds = useMemo(
        () => (data?.isGroup ? data.userIds : [counterParty].filter(notUndefined)),
        [counterParty, data?.isGroup, data?.userIds],
    )

    return <AvatarGroup userIds={userIds} width={props.width} />
}

const REMAINING_PLACEHOLDER = 'REMAINING_PLACEHOLDER'

type AvatarGroupProps = {
    userIds?: string[]
    width?: 'x3' | 'x4' | 'x6'
}

/**
 * Define how sizes are distributed depending on the number of circles to show
 * For now the index of the array defines the number of items but it can easily
 * be rethought if for instance we would like to make one of the avatars more prominent.
 */
const constellations = [
    // single avatar
    [{ size: 1.0 }],
    // 2 avatars
    [{ size: 0.5 }, { size: 0.5 }],
    // 3 avatars
    [{ size: 0.4 }, { size: 0.38 }, { size: 0.4 }],
]

const fontScale = { x3: 0.5, x4: 0.4, x6: 0.6 }

const AvatarGroup = (props: AvatarGroupProps) => {
    const { userIds, width = 'x6' } = props
    // note: profile should already have been removed from userIds
    if (!userIds?.length) {
        return <></>
    }

    // clamp number of avatars to always match a preset
    const total = Math.min(3, userIds.length)
    const constellationIndex = Math.max(0, Math.min(total - 1, constellations.length - 1))
    const constellation = constellations[constellationIndex]

    const containerRadius = `50%`

    // no margin for single avatar
    const MARGIN = userIds.length > 1 ? -5 : 0

    const slots = userIds.slice()

    if (userIds.length > 3) {
        // inserts placeholder for +X copy after first entry
        // participants are kept in order
        slots.splice(1, 0, REMAINING_PLACEHOLDER)
    }

    const startAngle = slots.length === 2 ? -1.3 : 1.3

    return (
        <Box position="relative" minWidth={width} height={width} rounded="full">
            <Box width="100%" height="100%" rounded="full">
                {slots.slice(0, 3).map((userId, i) => {
                    const radius = `calc(${constellation[i].size} * 50%`

                    // start of with a slightly tilted angle, then distribute avatars evenly
                    // around the circle
                    const angle = startAngle + Math.PI * -0.3333 + Math.PI * 2 * (i / total)
                    // center offset from top-left
                    const origin = containerRadius
                    // offset from center in the direction of the angle
                    const offset = `calc(50% - ${radius} - ${1 * MARGIN}%)`

                    const sizePercent = `${constellation[i].size * 100}%`

                    const avatarStyle = {
                        position: 'absolute',
                        width: sizePercent,
                        height: sizePercent,
                        transformOrigin: 'center center',
                        transform: `translate(-50%,-50%)`,
                        left: `calc(${origin} + ${Math.cos(angle)} * ${offset})`,
                        top: `calc(${origin} + ${Math.sin(angle)} * ${offset})`,
                    } as const

                    // this simply replaces the 2nd avatar with the number of remaining
                    // avatars - if the order of the displaying avatars matter we would need
                    // to insert instead
                    const text =
                        userId === REMAINING_PLACEHOLDER && userIds.length > 3
                            ? `+${userIds.length - 2}`
                            : undefined

                    return (
                        <Box position="absolute" style={avatarStyle} key={userId}>
                            {text ? (
                                <Box
                                    centerContent
                                    width="100%"
                                    height="100%"
                                    background="level2"
                                    rounded="full"
                                >
                                    <Box style={{ transform: `scale(${fontScale[width]})` }}>
                                        <Paragraph strong>{text}</Paragraph>
                                    </Box>
                                </Box>
                            ) : (
                                <Avatar userId={userId} size="avatar_100" />
                            )}
                        </Box>
                    )
                })}
            </Box>
        </Box>
    )
}
