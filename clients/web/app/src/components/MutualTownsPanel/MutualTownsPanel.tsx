import React, { useCallback, useMemo } from 'react'
import { Address, useMemberOf, useMyUserId, useTownsContext, useUserLookup } from 'use-towns-client'
import { useNavigate } from 'react-router'
import { Panel } from '@components/Panel/Panel'
import { Avatar } from '@components/Avatar/Avatar'
import { Paragraph, Stack } from '@ui'
import { SpaceIcon } from '@components/SpaceIcon'
import { ImageVariants } from '@components/UploadImage/useImageSource'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { PATHS } from 'routes'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'

export const MutualTownsPanel = (props: { userId: string }) => {
    const { userId } = props

    const { spaces } = useTownsContext()
    const user = useUserLookup(userId)

    const memberOf = useMemberOf(userId)
    const mutualTowns = useMemo(
        () => spaces.filter((s) => (memberOf ? s.id in memberOf : false)),
        [memberOf, spaces],
    )
    const navigate = useNavigate()

    const { openPanel } = usePanelActions()
    const { data: abstractAccountAddress } = useAbstractAccountAddress({
        rootKeyAddress: userId as Address | undefined,
    })

    const onUserClick = useCallback(() => {
        if (userId) {
            openPanel('profile', { profileId: abstractAccountAddress })
        }
    }, [abstractAccountAddress, openPanel, userId])

    const onTownClick = useCallback(
        (spaceId: string) => {
            navigate(`/${PATHS.SPACES}/${spaceId}`)
        },
        [navigate],
    )

    const isMyProfile = userId === useMyUserId()

    return (
        <Panel label={isMyProfile ? 'Towns' : 'Mutual Towns'}>
            <Stack gap>
                {!isMyProfile && (
                    <Stack horizontal gap="sm" alignItems="center" color="gray2" flexWrap="wrap">
                        <Paragraph>{`You share ${mutualTowns.length} town${
                            mutualTowns.length > 1 ? 's' : ''
                        } with`}</Paragraph>
                        <Stack
                            horizontal
                            hoverable
                            gap="sm"
                            color="gray1"
                            padding="sm"
                            paddingRight="paragraph"
                            borderRadius="full"
                            background="level2"
                            alignItems="center"
                            cursor="pointer"
                            onClick={onUserClick}
                        >
                            <Avatar userId={userId} size="avatar_xs" />
                            <Paragraph whiteSpace="nowrap">{getPrettyDisplayName(user)}</Paragraph>
                        </Stack>
                    </Stack>
                )}
                <Stack inset="xs">
                    {mutualTowns.map((s) => (
                        <Stack
                            horizontal
                            hoverable
                            borderRadius="sm"
                            key={s.id}
                            gap="sm"
                            alignItems="center"
                            background="level1"
                            padding="sm"
                            cursor="pointer"
                            onClick={() => {
                                onTownClick(s.id)
                            }}
                        >
                            <SpaceIcon
                                background="level1"
                                border="strongFaint"
                                rounded="sm"
                                letterFontSize="sm"
                                width="x4"
                                height="x4"
                                spaceId={s?.id}
                                firstLetterOfSpaceName={s?.name[0]}
                                overrideBorderRadius="xs"
                                variant={ImageVariants.thumbnail50}
                                fadeIn={false}
                                tooltip={s?.name}
                            />
                            <Paragraph color="gray1">{s.name}</Paragraph>
                        </Stack>
                    ))}
                </Stack>
            </Stack>
        </Panel>
    )
}
