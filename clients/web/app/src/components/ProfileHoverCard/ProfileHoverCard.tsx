import React, { useMemo } from 'react'
import {
    getAccountAddress,
    useMyUserId,
    useUserLookupContext,
    useZionContext,
} from 'use-zion-client'
import { Avatar } from '@components/Avatar/Avatar'
import { SpaceIcon } from '@components/SpaceIcon'
import { ImageVariants } from '@components/UploadImage/useImageSource'
import { useGetUserBio } from 'hooks/useUserBio'
import { Stack } from 'ui/components/Stack/Stack'
import { Paragraph } from 'ui/components/Text/Paragraph'
import { Tooltip } from 'ui/components/Tooltip/Tooltip'
import { notUndefined } from 'ui/utils/utils'
import { Box, Text } from '@ui'

type Props = {
    userId: string
}

export const ProfileHoverCard = (props: Props) => {
    const { userId } = props
    const { spaces } = useZionContext()
    const { usersMap } = useUserLookupContext()
    const myUserId = useMyUserId()

    const user = usersMap[userId]
    const userAddress = getAccountAddress(userId)
    const { data: userBio } = useGetUserBio(userAddress)

    const memberOf = useMemo(() => {
        const memberOfIds = Object.keys(user?.memberOf ?? [])
        return memberOfIds?.length
            ? memberOfIds.map((spaceId) => spaces.find((f) => f.id.streamId === spaceId))
            : undefined
    }, [spaces, user.memberOf])

    const membersText = () => {
        if (memberOf && memberOf.length > 1) {
            if (userId === myUserId) {
                return `member of ${memberOf.length} towns`
            }
            return `${memberOf.length} mutual towns`
        } else if (memberOf && memberOf.length === 1) {
            return `member of ${memberOf[0]?.name}`
        } else {
            return ''
        }
    }

    return user ? (
        <Tooltip gap maxWidth="300" background="level2" border="level3">
            <Stack gap padding="sm">
                <Stack horizontal gap>
                    <Avatar userId={userId} size="avatar_lg" />

                    <Stack justifyContent="center" gap="sm">
                        {user.displayName.length > 0 && (
                            <Paragraph truncate strong color="default">
                                {user.displayName}
                            </Paragraph>
                        )}

                        {user.username.length > 0 && (
                            <Paragraph truncate color="gray2">
                                @{user.username}
                            </Paragraph>
                        )}
                    </Stack>
                </Stack>
                {memberOf ? (
                    <Stack horizontal gap="xs" color="gray1" alignItems="center" paddingLeft="md">
                        {memberOf.filter(notUndefined).map((s) => (
                            <React.Fragment key={s.id.streamId}>
                                <Box insetLeft="sm">
                                    <SpaceIcon
                                        background="level1"
                                        border="strongFaint"
                                        rounded="sm"
                                        letterFontSize="sm"
                                        width="x4"
                                        height="x4"
                                        spaceId={s?.id.streamId}
                                        firstLetterOfSpaceName={s?.name[0]}
                                        overrideBorderRadius="xs"
                                        variant={ImageVariants.thumbnail50}
                                        fadeIn={false}
                                    />
                                </Box>
                            </React.Fragment>
                        ))}
                        <Text size="md" color="gray2" fontWeight="medium">
                            {membersText()}
                        </Text>
                    </Stack>
                ) : (
                    <></>
                )}
                {userBio && (
                    <Stack>
                        <Paragraph strong size="md">
                            Bio
                        </Paragraph>
                        <Paragraph size="md" color="gray2">
                            {userBio}
                        </Paragraph>
                    </Stack>
                )}
            </Stack>
        </Tooltip>
    ) : (
        <Tooltip>User info not available</Tooltip>
    )
}
