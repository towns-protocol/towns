import React, { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import { useChannelData, useChannelMembers, useRoom, useZionClient } from 'use-zion-client'
import { Panel, Paragraph, Stack } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'

export const ChannelInfoPanel = () => {
    const { channel } = useChannelData()
    const navigate = useNavigate()
    const { isRoomEncrypted } = useZionClient()
    const isEncrypted = channel && isRoomEncrypted(channel.id)
    const room = useRoom(channel?.id)
    const { members } = useChannelMembers()

    const onClose = useEvent(() => {
        navigate('..')
    })
    const info = useMemo(
        () => [
            {
                title: 'Description',
                content: `${room?.topic ?? 'No description'}`,
            },
            {
                title: 'Population',
                content: `${members.length} member${members.length > 1 ? `s` : ``}`,
            },
            {
                title: 'Encryption',
                content: `This channel ${isEncrypted ? `is` : `is not`} end-to-end encrypted`,
            },
        ],
        [isEncrypted, members.length, room?.topic],
    )

    return (
        <Stack grow height="100%" overflow="hidden">
            <Panel label="Channel Info" onClose={onClose}>
                <Stack gap="lg" padding="lg">
                    <Paragraph strong size="lg">
                        {channel?.label}
                    </Paragraph>
                    <ClipboardCopy label={channel?.id.networkId ?? ''} />

                    {!!info?.length &&
                        info.map((n) => (
                            <Stack key={`${n.title}`}>
                                <Paragraph strong>{n.title}</Paragraph>
                                <Paragraph color="gray2">{n.content}</Paragraph>
                            </Stack>
                        ))}
                </Stack>
            </Panel>
        </Stack>
    )
}
