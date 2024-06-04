import React from 'react'
import { ChannelContextProvider, useMyUserId } from 'use-towns-client'
import { DMChannelIntro } from '@components/ChannelIntro'
import { RichTextEditor } from '@components/RichTextPlate/PlateEditor'
import { useUserList } from '@components/UserList/UserList'
import { Box } from '@ui'
import { getDraftDMStorageId } from 'utils'

type Props = {
    userIds: string[]
    autoFocus?: boolean
}
export const ChannelPlaceholder = ({ userIds: _userIds, autoFocus = false }: Props) => {
    const myUserId = useMyUserId()
    const userIds = _userIds.filter((u) => u !== myUserId)
    const userList = useUserList({ excludeSelf: true, userIds }).join('')
    return (
        <ChannelContextProvider channelId="">
            <Box paddingY grow justifyContent="end" gap="lg">
                <DMChannelIntro userIds={userIds} />
                <Box paddingX="md">
                    <RichTextEditor
                        disabledSend
                        autoFocus={autoFocus}
                        storageId={getDraftDMStorageId(_userIds)}
                        channels={[]}
                        users={[]}
                        placeholder={`Send a message to ${userList}`}
                    />
                </Box>
            </Box>
        </ChannelContextProvider>
    )
}
