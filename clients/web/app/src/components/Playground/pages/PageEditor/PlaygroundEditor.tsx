import React, { useRef } from 'react'
import { PlateEditor, Value } from '@udecode/plate-common'
import { ChannelContextProvider, LookupUserFn, SendTextMessageOptions } from 'use-towns-client'
import { RichTextEditor } from '@components/RichTextPlate/RichTextEditor'
import { useEditorChannelData } from '@components/RichTextPlate/hooks/editorHooks'
import {
    convertUserToCombobox,
    getUserHashMap,
} from '@components/RichTextPlate/components/plate-ui/autocomplete/helpers'
import { channels, roomMembers } from './data'

type Props = {
    onChange?: (editor: PlateEditor<Value>) => void
    onSend?: (message: string, options: SendTextMessageOptions) => void
    lookupUser: LookupUserFn
}
export const PlaygroundEditor = ({ lookupUser, onChange, onSend }: Props) => {
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
