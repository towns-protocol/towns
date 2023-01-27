import React from 'react'
import { useNavigate, useParams } from 'react-router'
import useEvent from 'react-use-event-hook'
import { useSpaceMembers } from 'use-zion-client'
import { shortAddress } from 'ui/utils/utils'
import { BackgroundImage, Icon, Panel, Paragraph, Stack, Text } from '@ui'

export const SpaceProfilePanel = (props: { children?: React.ReactNode }) => {
    const { profileId } = useParams()
    const navigate = useNavigate()

    const onClose = useEvent(() => {
        navigate('..')
    })

    const { membersMap } = useSpaceMembers()

    const user = profileId ? membersMap[profileId] : undefined

    const isValid = !!user

    const userAddress = isValid ? user.userId.match(/0x[a-f0-9]{40}/i)?.[0] ?? '' : ''

    return (
        <Stack grow height="100%" overflow="hidden">
            <Panel label="Profile" onClose={onClose}>
                {isValid ? (
                    <>
                        <Stack grow padding gap position="relative">
                            <Stack centerContent>
                                <Stack
                                    width="100%"
                                    aspectRatio="1/1"
                                    rounded="full"
                                    overflow="hidden"
                                    maxWidth="250"
                                >
                                    <BackgroundImage src={user.avatarUrl} size="cover" />
                                </Stack>
                            </Stack>
                            <Stack grow gap>
                                <Paragraph strong size="lg">
                                    {user.name}
                                </Paragraph>
                                {userAddress && (
                                    <Stack horizontal gap="sm" alignItems="center">
                                        <Stack>
                                            <Text truncate size="md" color="gray2">
                                                {shortAddress(userAddress)}
                                            </Text>
                                        </Stack>
                                        <Stack>
                                            <Icon type="copy" color="gray2" size="square_xs" />
                                        </Stack>
                                    </Stack>
                                )}
                                <Paragraph>Bio</Paragraph>
                                <Paragraph>
                                    {`Please come back when I have written my bio. It shouldn't be more thans a few
                    lines written in a way that makes you want to know more about me.`}
                                </Paragraph>
                            </Stack>
                        </Stack>
                    </>
                ) : (
                    <Paragraph>Profile not found</Paragraph>
                )}
            </Panel>
        </Stack>
    )
}
