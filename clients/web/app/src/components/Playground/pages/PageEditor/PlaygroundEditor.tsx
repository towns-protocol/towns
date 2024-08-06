import React, { useRef } from 'react'
import { PlateEditor, Value } from '@udecode/plate-common'
import { ChannelContextProvider, LookupUser, SendTextMessageOptions } from 'use-towns-client'
import { RichTextEditor } from '@components/RichTextPlate/RichTextEditor'
import { useEditorChannelData } from '@components/RichTextPlate/hooks/editorHooks'
import {
    convertUserToCombobox,
    getUserHashMap,
} from '@components/RichTextPlate/components/plate-ui/autocomplete/helpers'
import { channels, roomMembers } from './data'

const lookupUser = (userId: string) =>
    roomMembers.find((user) => user.userId === userId) as LookupUser

type Props = {
    onChange?: (editor: PlateEditor<Value>) => void
    onSend?: (message: string, options: SendTextMessageOptions) => void
}
export const PlaygroundEditor = ({ onChange, onSend }: Props) => {
    const userMentions = useRef(
        roomMembers.map((user) => convertUserToCombobox(user, ['1', '2', '5', '6'])),
    )
    const userHashMap = useRef(getUserHashMap(roomMembers))
    const { channelMentions } = useEditorChannelData(channels)

    return (
        <ChannelContextProvider channelId="playground-editor">
            <RichTextEditor
                userHashMap={userHashMap.current}
                userMentions={userMentions.current}
                channelMentions={channelMentions}
                channels={channels}
                lookupUser={lookupUser}
                onChange={onChange}
                onSend={onSend}
            />
        </ChannelContextProvider>
    )
}
