import React from 'react'
import { useMyUserId } from 'use-towns-client'
import { DMChannelIntro } from '@components/ChannelIntro'
import { RichTextEditor } from '@components/RichTextPlate/PlateEditor'
import { useUserList } from '@components/UserList/UserList'
import { Box } from '@ui'

export const ChannelPlaceholder = (props: { userIds: string[] }) => {
    const myUserId = useMyUserId()
    const userIds = props.userIds.filter((u) => u !== myUserId)
    const userList = useUserList({ excludeSelf: true, userIds }).join('')
    return (
        <Box paddingY grow justifyContent="end" gap="lg">
            <DMChannelIntro userIds={userIds} />
            <Box paddingX="md">
                <RichTextEditor
                    editable={false}
                    channels={[]}
                    users={[]}
                    placeholder={`Send a message to ${userList}`}
                />
            </Box>
        </Box>
    )
}
