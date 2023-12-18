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
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'

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
        <Tooltip gap padding maxWidth="300">
            <Stack horizontal gap>
                <Stack
                    width="x10"
                    aspectRatio="1/1"
                    position="relative"
                    rounded="full"
                    overflow="hidden"
                >
                    <Avatar userId={userId} size="avatar_100" />
                </Stack>
                <Stack justifyContent="center" gap="sm">
                    <Paragraph truncate strong>
                        {getPrettyDisplayName(user).displayName}
                    </Paragraph>
                    <Paragraph color="gray2">{userAddress && shortAddress(userAddress)}</Paragraph>
                    {memberOf ? (
                        <Stack horizontal gap="xs">
                            {memberOf
                                .filter(notUndefined)

                                .map((s) => (
                                    <React.Fragment key={s.id.streamId}>
                                        <SpaceIcon
                                            border
                                            letterFontSize="sm"
                                            width="x2"
                                            height="x2"
                                            spaceId={s?.id.streamId}
                                            firstLetterOfSpaceName={s?.name[0]}
                                            overrideBorderRadius="xs"
                                            variant={ImageVariants.thumbnail50}
                                            fadeIn={false}
                                        />
                                    </React.Fragment>
                                ))}
                        </Stack>
                    ) : (
                        <></>
                    )}
                </Stack>
            </Stack>

            {userBio && (
                <Stack>
                    <Paragraph strong size="sm">
                        Bio
                    </Paragraph>
                    <Paragraph size="sm" color="gray1">
                        {userBio}
                    </Paragraph>
                </Stack>
            )}
        </Tooltip>
    ) : (
        <Tooltip>User info not available</Tooltip>
    )
}
