import React, { useMemo } from 'react'
import { RoomIdentifier, useDMData } from 'use-zion-client'
import { Box, Paragraph } from '@ui'
import { notUndefined } from 'ui/utils/utils'
import { Avatar } from '@components/Avatar/Avatar'

type Props = {
    roomIdentifier: RoomIdentifier
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

type AvatarGroupProps = {
    userIds?: string[]
    width?: 'x3' | 'x4' | 'x6'
}

const REMAINING_PLACEHOLDER = 'REMAINING_PLACEHOLDER'

export const AvatarGroup = (props: AvatarGroupProps) => {
    const { userIds, width = 'x6' } = props
    // note: profile should already have been removed from userIds
    if (!userIds?.length) {
        return <></>
    }

    const slots = userIds.slice()

    if (userIds.length > 2) {
        // inserts placeholder for +X copy after first entry
        // participants are kept in order
        slots.splice(1, 0, REMAINING_PLACEHOLDER)
    }

    const startAngle = Math.PI * 1.25
    const total = 2

    const { size, borderWidth, fontScale } = {
        x3: { size: '75%', fontScale: 0.5, borderWidth: 2 },
        x4: { size: '75%', fontScale: 0.6, borderWidth: 2 },
        x6: { size: '66%', fontScale: 0.8, borderWidth: 2 },
    }[width]

    return (
        <Box position="relative" minWidth={width} height={width} maxHeight={width}>
            <Box absoluteFill>
                {slots.slice(0, 2).map((userId, i) => {
                    // start of with a slightly tilted angle, then distribute avatars evenly
                    // around the circle
                    const angle = startAngle + Math.PI * 2 * (i / total)
                    // center offset from top-left
                    const origin = `50%`
                    // offset from center in the direction of the angle
                    const offset = `calc(50% - (-${borderWidth * 4}px + ${size}) * 0.5 )`

                    const avatarStyle = {
                        position: 'absolute',
                        width: size,
                        height: size,
                        transformOrigin: 'center center',
                        transform: `translate(-50%,-50%)`,
                        left: `calc(${origin} + ${Math.cos(angle)} * ${offset})`,
                        top: `calc(${origin} + ${Math.sin(angle)} * ${offset})`,
                        border: `${borderWidth}px solid var(--background)`,
                    } as const

                    return (
                        <Box border key={userId} style={avatarStyle} rounded="full">
                            {userId === REMAINING_PLACEHOLDER ? (
                                <Box
                                    centerContent
                                    rounded="full"
                                    background="level4"
                                    width="100%"
                                    height="100%"
                                >
                                    <Box style={{ transform: `scale(${fontScale})` }}>
                                        <Paragraph strong>{userIds.length - 1}</Paragraph>
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
