import React from 'react'
import { useMyUserId } from 'use-zion-client'
import { DMChannelIntro } from '@components/ChannelIntro'
import { RichTextEditor } from '@components/RichText/RichTextEditor'
import { useUserList } from '@components/UserList/UserList'
import { Box } from '@ui'

export const ChannelPlaceholder = (props: { userIds: string[] }) => {
    const myUserId = useMyUserId()
    const userIds = props.userIds.filter((u) => u !== myUserId)
    const userList = useUserList({ excludeSelf: true, userIds }).join('')
    return userIds.length ? (
        <Box padding grow justifyContent="end" gap="lg">
            <DMChannelIntro userIds={userIds} />
            <RichTextEditor
                channels={[]}
                users={[]}
                placeholder={`Send a message to ${userList}`}
            />
        </Box>
    ) : (
        <></>
    )
}
