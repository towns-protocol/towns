import React, { useMemo } from 'react'
import { RoomIdentifier, useDMData } from 'use-zion-client'
import { Avatar } from '@components/Avatar/Avatar'
import { LetterStylesVariantProps } from '@components/IconInitials/IconInitials.css'
import { Box, BoxProps, Paragraph } from '@ui'
import { notUndefined } from 'ui/utils/utils'

export const GroupDMIcon = (props: {
    roomIdentifier: RoomIdentifier
    letterFontSize?: LetterStylesVariantProps
    width?: BoxProps['width']
}) => {
    // const { width = 'x6' } = props

    const { counterParty, data } = useDMData(props.roomIdentifier)
    const userIds = useMemo(
        () => (data?.isGroup ? data.userIds : [counterParty].filter(notUndefined)),
        [counterParty, data?.isGroup, data?.userIds],
    )

    return <AvatarGroup userIds={userIds} />
}

const REMAINING_PLACEHOLDER = 'REMAINING_PLACEHOLDER'

type Props = {
    userIds?: string[]
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
    [{ size: 0.43 }, { size: 0.43 }],
    // 3 avatars
    [{ size: 0.4 }, { size: 0.4 }, { size: 0.4 }],
]

const AvatarGroup = (props: Props) => {
    const { userIds } = props
    // note: profile should already have been removed from userIds
    if (!userIds?.length) {
        return <></>
    }
    const size = 8 * 6 + 1

    // clamp number of avatars to always match a preset
    const total = Math.min(3, userIds.length)
    const constellationIndex = Math.max(0, Math.min(total - 1, constellations.length - 1))
    const constellation = constellations[constellationIndex]

    const containerRadius = size / 2

    // no margin for single avatar
    const MARGIN = userIds.length > 1 ? 2 : 0

    const slots = userIds.slice()

    if (userIds.length > 3) {
        // inserts placeholder for +X copy after first entry
        // participants are kept in order
        slots.splice(1, 0, REMAINING_PLACEHOLDER)
    }

    return (
        <Box position="relative" width="x6" height="x6" rounded="full">
            <Box background="level3" width="100%" height="100%" rounded="full">
                {slots.slice(0, 3).map((userId, i) => {
                    const radius = (constellation[i].size * containerRadius * 2) / 2

                    // start of with a slightly tilted angle, then distribute avatars evenly
                    // around the circle
                    const angle = Math.PI * -0.33 + Math.PI * 2 * (i / total)
                    // center offset from top-left
                    const origin = containerRadius
                    // offset from center in the direction of the angle
                    const offset = containerRadius - radius - MARGIN

                    const sizePercent = `${constellation[i].size * 100}%`

                    const avatarStyle = {
                        position: 'absolute',
                        width: sizePercent,
                        height: sizePercent,
                        transformOrigin: 'center center',
                        transform: `translate(-50%,-50%)`,
                        left: origin + Math.cos(angle) * offset,
                        top: origin + Math.sin(angle) * offset,
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
                                    <Box style={{ transform: `scale(0.85)` }}>
                                        <Paragraph strong size="xs">
                                            {text}
                                        </Paragraph>
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
