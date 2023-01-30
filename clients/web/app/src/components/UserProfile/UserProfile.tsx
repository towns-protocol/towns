import React from 'react'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { BackgroundImage, Paragraph, Stack } from '@ui'
import { shortAddress } from 'ui/utils/utils'

type Props = {
    avatarUrl?: string
    displayName: string
    userAddress?: string
    center?: boolean
    info?: { title: string; content: string | JSX.Element }[]
}

export const UserProfile = (props: Props) => {
    const { center, displayName, avatarUrl, userAddress, info } = props
    return (
        <Stack grow padding gap position="relative">
            <Stack centerContent={center}>
                <Stack
                    width="100%"
                    aspectRatio="1/1"
                    rounded="full"
                    overflow="hidden"
                    maxWidth="200"
                >
                    <BackgroundImage src={avatarUrl} size="cover" />
                </Stack>
            </Stack>
            <Stack grow gap>
                <Paragraph strong size="lg">
                    {displayName}
                </Paragraph>
                {userAddress && <ClipboardCopy label={shortAddress(userAddress)} />}

                {!!info?.length &&
                    info.map((n) => (
                        <>
                            <Paragraph strong>{n.title}</Paragraph>
                            <Paragraph color="gray2">{n.content}</Paragraph>
                        </>
                    ))}
            </Stack>
        </Stack>
    )
}
