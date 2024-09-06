import React, { useCallback, useRef } from 'react'
import { PlateEditor, Value } from '@udecode/plate-common'
import { ChannelContextProvider, LookupUserFn, SendTextMessageOptions } from 'use-towns-client'
import { RichTextEditor } from '@components/RichTextPlate/RichTextEditor'
import { useEditorChannelData } from '@components/RichTextPlate/hooks/editorHooks'
import { useMediaDropContext } from '@components/MediaDropContext/MediaDropContext'
import { FileUpload } from '@components/MediaDropContext/mediaDropTypes'
import {
    convertUserToCombobox,
    getUserHashMap,
} from '@components/RichTextPlate/components/plate-ui/autocomplete/helpers'
import { channels, roomMembers } from './data'

type Props = {
    onChange?: (editor: PlateEditor<Value>) => void
    setMarkdown?: (message: string) => void
    setAttachments?: (attachments: FileUpload[]) => void
    lookupUser: LookupUserFn
}
export const PlaygroundEditor = ({ lookupUser, onChange, setMarkdown, setAttachments }: Props) => {
    const userMentions = useRef(
        roomMembers.map((user) => convertUserToCombobox(user, ['1', '2', '5', '6'])),
    )
    const userHashMap = useRef(getUserHashMap(roomMembers))
    const { channelMentions } = useEditorChannelData(channels)
    const { files, clearFiles } = useMediaDropContext()

    const onSend = useCallback(
        (message: string, _: SendTextMessageOptions) => {
            setMarkdown?.(message)
            setAttachments?.(files)
            setTimeout(() => clearFiles?.(), 0)
        },
        [setMarkdown, setAttachments, files, clearFiles],
    )

    return (
        <ChannelContextProvider channelId="playground-editor">
            <RichTextEditor
                userHashMap={userHashMap.current}
                userMentions={userMentions.current}
                channelMentions={channelMentions}
                fileCount={files.length}
                channels={channels}
                lookupUser={lookupUser}
                onChange={onChange}
                onSend={onSend}
            />
        </ChannelContextProvider>
    )
}
