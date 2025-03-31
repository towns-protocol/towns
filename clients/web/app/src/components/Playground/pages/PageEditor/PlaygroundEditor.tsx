import React, { useCallback, useRef } from 'react'
import { ChannelContextProvider, LookupUserFn, SendTextMessageOptions } from 'use-towns-client'
import { RichTextEditor } from '@components/RichTextPlate/RichTextEditor'
import { useEditorChannelData } from '@components/RichTextPlate/hooks/editorHooks'
import { useMediaDropContext } from '@components/MediaDropContext/MediaDropContext'
import { FileUpload } from '@components/MediaDropContext/mediaDropTypes'
import {
    convertUserToCombobox,
    getUserHashMap,
} from '@components/RichTextPlate/components/plate-ui/autocomplete/helpers'
import { channels, streamMembers } from './data'

type Props = {
    setMarkdown: React.Dispatch<React.SetStateAction<string>>
    setIsEditing: React.Dispatch<React.SetStateAction<boolean>>
    setAttachments: React.Dispatch<React.SetStateAction<FileUpload[]>>
    lookupUser: LookupUserFn
    initialValue?: string
    isEditing?: boolean
}
export const PlaygroundEditor = ({
    initialValue,
    isEditing = false,
    lookupUser,
    setMarkdown,
    setAttachments,
    setIsEditing,
}: Props) => {
    const userMentions = useRef(
        streamMembers.map((user) => convertUserToCombobox(user, ['1', '2', '5', '6'])),
    )
    const userHashMap = useRef(getUserHashMap(streamMembers))
    const { channelMentions } = useEditorChannelData(channels)
    const { files, clearFiles } = useMediaDropContext()

    const onSend = useCallback(
        (message: string, _: SendTextMessageOptions) => {
            setMarkdown?.(message)
            setAttachments?.(files)
            setIsEditing(false)
            setTimeout(() => clearFiles?.(), 0)
        },
        [setMarkdown, setIsEditing, setAttachments, files, clearFiles],
    )

    const onCancel = useCallback(() => {
        setIsEditing(false)
        setTimeout(() => clearFiles?.(), 0)
    }, [setIsEditing, clearFiles])

    return (
        <ChannelContextProvider channelId="playground-editor">
            <RichTextEditor
                initialValue={initialValue}
                editing={isEditing}
                userHashMap={userHashMap.current}
                userMentions={userMentions.current}
                channelMentions={channelMentions}
                fileCount={files.length}
                channels={channels}
                lookupUser={lookupUser}
                onSend={onSend}
                onCancel={onCancel}
            />
        </ChannelContextProvider>
    )
}
