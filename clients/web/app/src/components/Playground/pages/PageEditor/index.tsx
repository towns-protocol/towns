/* eslint-disable */
// @ts-nocheck
import React, { useCallback, useRef, useState } from 'react'
import { TPlateEditor } from '@udecode/plate-common/react'
import { LookupUser } from 'use-towns-client'
import { MediaDropContextProvider } from '@components/MediaDropContext/MediaDropContext'
import { FileUpload, FileUploadFileContent } from '@components/MediaDropContext/mediaDropTypes'
import { PlaygroundEditor } from '@components/Playground/pages/PageEditor/PlaygroundEditor'
import { code, codeBlock } from '@components/RichTextPlate/RichTextEditor.css'
import { RichTextPreviewInternal } from '@components/RichTextPlate/RichTextPreview'
import { Box, Button, Paragraph, Stack, Text, ZLayerProvider } from '@ui'
import { channels, streamMembers } from './data'

type InputEvent = {
    type: string
    inputType: string
    code: string
    data: string
    dataTransfer: string
    ranges: string
}

const lookupUser = (userId: string) =>
    streamMembers.find((user) => user.userId === userId) as LookupUser

const getAttachmentDetails = (attachments: FileUpload[]) => {
    return attachments.map((attachment) => {
        const content = attachment.content as FileUploadFileContent
        return [content.file.name, content.file.size, content.file.type].join(' ')
    })
}

export const PageEditor = () => {
    const ref = useRef<HTMLDivElement>(null)
    const [editorChildren, setEditorChildren] = useState<Value>([])
    const [markdown, setMarkdown] = useState<string>('')
    const [isEditing, setIsEditing] = useState<boolean>(false)
    const [attachments, setAttachments] = useState<FileUpload[]>([])
    const [events, setEvents] = useState<InputEvent[]>([])

    const onChange = useCallback(
        (editor: TPlateEditor) => {
            setEditorChildren(editor.children)
        },
        [setEditorChildren],
    )

    const toggleEditMode = useCallback(() => {
        setIsEditing((prev) => !prev)
    }, [setIsEditing])

    const clearEvents = useCallback(() => {
        setEvents([])
    }, [setEvents])

    return (
        <ZLayerProvider>
            <Stack
                horizontal
                label="Page Editor"
                gap="md"
                height="50vh"
                padding="md"
                borderBottom="level4"
            >
                <Box grow maxWidth="50%" height="100%">
                    <Text as="h5" textAlign="center" size="lg">
                        Plate JSON
                    </Text>
                    <Box as="pre" overflowY="scroll" className={codeBlock}>
                        <code data-testid="editor-json-preview">
                            {JSON.stringify(editorChildren, null, 2)}
                        </code>
                    </Box>
                </Box>
                <Stack
                    gap
                    width="50%"
                    height="100%"
                    minWidth="200"
                    justifyContent="end"
                    overflowY="scroll"
                    borderLeft="level4"
                    paddingLeft="md"
                >
                    <Text as="h5" textAlign="center" size="lg">
                        Output markdown (updated on send / enter)
                    </Text>
                    {markdown.length > 0 && (
                        <>
                            <Paragraph strong textAlign="center">
                                Markdown
                            </Paragraph>
                            <Box as="pre" overflowY="scroll" className={codeBlock}>
                                <code data-testid="editor-md-preview">{markdown}</code>
                            </Box>
                            <Stack horizontal gap justifyContent="center" alignItems="center">
                                <Text strong>Rich Text Preview</Text>
                                <Button
                                    size="button_xs"
                                    data-testid="toggle-edit"
                                    onClick={toggleEditMode}
                                >
                                    {isEditing ? 'Preview' : 'Edit'}
                                </Button>
                            </Stack>
                            <Box
                                padding="sm"
                                paddingY="lg"
                                minHeight="100"
                                border="level3"
                                data-testid="editor-jsx-preview"
                            >
                                <RichTextPreviewInternal
                                    channels={channels}
                                    mentions={streamMembers}
                                    content={markdown}
                                    lookupUser={lookupUser}
                                />
                            </Box>
                        </>
                    )}
                    {attachments.length > 0 && (
                        <>
                            <Paragraph strong textAlign="center">
                                Attachments
                            </Paragraph>
                            <Box as="pre" overflowY="scroll" className={codeBlock}>
                                <code data-testid="editor-attachments-preview">
                                    {JSON.stringify(getAttachmentDetails(attachments), null, 2)}
                                </code>
                            </Box>
                        </>
                    )}
                    <Box
                        border="level3"
                        background="level2"
                        width="100%"
                        data-testid="editor-container"
                        position="relative"
                        style={{ marginTop: 'auto' }}
                        ref={ref}
                    >
                        <MediaDropContextProvider
                            channelId="playground-editor-channel"
                            spaceId="playground-editor-space"
                            title=""
                        >
                            <PlaygroundEditor
                                setMarkdown={setMarkdown}
                                setAttachments={setAttachments}
                                setIsEditing={setIsEditing}
                                lookupUser={lookupUser}
                                isEditing={isEditing}
                                initialValue={isEditing ? markdown : undefined}
                                key={isEditing ? 'edit' : 'preview'}
                                onChange={onChange}
                            />
                        </MediaDropContextProvider>
                    </Box>
                </Stack>
            </Stack>
            <Box height="50vh" padding="md">
                <Stack horizontal gap="lg" justifyContent="center">
                    <Text as="h5" textAlign="center" size="lg">
                        Input events
                    </Text>
                    <Button size="button_xs" onClick={clearEvents}>
                        Clear events
                    </Button>
                </Stack>
                <br />
                <table className={code} border={1}>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>type</th>
                            <th>inputType</th>
                            <th>code</th>
                            <th>data</th>
                            <th>dataTransfer</th>
                            <th>ranges</th>
                        </tr>
                    </thead>

                    <tbody>
                        {events.map((event, index) => (
                            <tr key={`kbdevent-${event.code}`}>
                                <td width={15}>{index + 1}</td>
                                <td width={100}>{event.type}</td>
                                <td width={200}>{event.inputType}</td>
                                <td width={100}>{event.code}</td>
                                <td width={60}>{event.data}</td>
                                <td width={120}>{event.dataTransfer}</td>
                                <td>{event.ranges}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Box>
        </ZLayerProvider>
    )
}
