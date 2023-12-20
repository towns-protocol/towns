import React, { useMemo } from 'react'
import { getAccountAddress, useUserLookupContext, useZionContext } from 'use-zion-client'
import { Avatar } from '@components/Avatar/Avatar'
import { SpaceIcon } from '@components/SpaceIcon'
import { ImageVariants } from '@components/UploadImage/useImageSource'
import { useGetUserBio } from 'hooks/useUserBio'
import { Stack } from 'ui/components/Stack/Stack'
import { Paragraph } from 'ui/components/Text/Paragraph'
import { Tooltip } from 'ui/components/Tooltip/Tooltip'
import { notUndefined, shortAddress } from 'ui/utils/utils'
import { Text } from '@ui'

type Props = {
    userId: string
}

export const ProfileHoverCard = (props: Props) => {
    const { userId } = props
    const { spaces } = useZionContext()
    const { usersMap } = useUserLookupContext()

    const user = usersMap[userId]
    const userAddress = getAccountAddress(userId)
    const { data: userBio } = useGetUserBio(userAddress)

    const memberOf = useMemo(() => {
        const memberOfIds = Object.keys(user?.memberOf ?? [])
        return memberOfIds?.length
            ? memberOfIds.map((spaceId) => spaces.find((f) => f.id.streamId === spaceId))
            : undefined
    }, [spaces, user.memberOf])

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

                        <Paragraph color="gray2" size="md">
                            {userAddress && shortAddress(userAddress)}
                        </Paragraph>
                    </Stack>
                </Stack>
                {memberOf ? (
                    <Stack horizontal gap="xs" color="gray1" alignItems="center">
                        {memberOf.filter(notUndefined).map((s) => (
                            <React.Fragment key={s.id.streamId}>
                                <SpaceIcon
                                    border
                                    letterFontSize="sm"
                                    width="x3"
                                    height="x3"
                                    spaceId={s?.id.streamId}
                                    firstLetterOfSpaceName={s?.name[0]}
                                    overrideBorderRadius="xs"
                                    variant={ImageVariants.thumbnail50}
                                    fadeIn={false}
                                />
                            </React.Fragment>
                        ))}
                        <Text size="md" color="gray2">
                            member of {memberOf.length} town{memberOf.length > 1 ? 's' : ''}
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
