/* eslint-disable */
// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { PlateEditor, Value } from '@udecode/plate-common'
import { SendTextMessageOptions } from 'use-towns-client'
import { PlaygroundEditor } from '@components/Playground/pages/PageEditor/PlaygroundEditor'
import { code, codeBlock } from '@components/RichTextPlate/RichTextEditor.css'
import { Box, Button, Stack, Text } from '@ui'

type InputEvent = {
    type: string
    inputType: string
    code: string
    data: string
    dataTransfer: string
    ranges: string
}

const EVENTS_TO_CAPTURE = [
    'beforeinput',
    'compositionend',
    'compositionstart',
    'compositionupdate',
    'keydown',
    'keypress',
    'keyup',
    'input',
    'paste',
    'textInput',
]

export const PageEditor = () => {
    const ref = useRef<HTMLDivElement>(null)
    const [editorChildren, setEditorChildren] = useState<Value>([])
    const [markdown, setMarkdown] = useState<string>('')
    const [events, setEvents] = useState<InputEvent[]>([])

    const onChange = useCallback(
        (editor: PlateEditor<Value>) => {
            setEditorChildren(editor.children)
        },
        [setEditorChildren],
    )

    const onSend = useCallback(
        (message: string, options: SendTextMessageOptions) => {
            setMarkdown(message)
        },
        [setMarkdown],
    )

    const clearEvents = useCallback(() => {
        setEvents([])
    }, [setEvents])

    useEffect(() => {
        EVENTS_TO_CAPTURE.forEach((eventName) => {
            ref.current
                .querySelector('[contenteditable="true"]')
                ?.addEventListener(eventName, (e: Event) => {
                    let dataTransfer
                    let ranges

                    if (e.dataTransfer) {
                        dataTransfer = {
                            text: e.dataTransfer.getData('text/plain'),
                            html: e.dataTransfer.getData('text/html'),
                        }
                    }

                    if (e.getTargetRanges) {
                        ranges = e.getTargetRanges().map((range) => {
                            return {
                                collapsed: range.collapsed,
                                endContainer: range.endContainer.tagName || 'text',
                                endOffset: range.endOffset,
                                startContainer: range.startContainer.tagName || 'text',
                                startOffset: range.startOffset,
                            }
                        })
                    }

                    setEvents((prev) => {
                        return [
                            ...prev,
                            {
                                type: eventName,
                                inputType: e.inputType,
                                code: e.code,
                                data: e.data,
                                dataTransfer: JSON.stringify(dataTransfer),
                                ranges: JSON.stringify(ranges),
                            },
                        ]
                    })
                })
        })

        return () => {
            if (!ref.current) {
                return
            }
            EVENTS_TO_CAPTURE.forEach((eventName) => {
                ref.current
                    ?.querySelector('[contenteditable="true"]')
                    ?.removeEventListener(eventName, () => {})
            })
        }
    }, [setEvents])

    return (
        <>
            <Stack
                horizontal
                label="Page Editor"
                gap="md"
                height="50vh"
                padding="md"
                borderBottom="level4"
            >
                <Stack
                    width="50%"
                    height="100%"
                    minWidth="200"
                    justifyContent="end"
                    overflowY="scroll"
                >
                    <Text as="h5" textAlign="center" size="lg">
                        Output markdown (updated on send / enter)
                    </Text>
                    {markdown.length > 0 && (
                        <Box as="pre" overflowY="scroll" className={codeBlock}>
                            <code>{markdown}</code>
                        </Box>
                    )}
                    <Box
                        border="level3"
                        background="level2"
                        width="100%"
                        style={{ marginTop: 'auto' }}
                        ref={ref}
                    >
                        <PlaygroundEditor onChange={onChange} onSend={onSend} />
                    </Box>
                </Stack>
                <Box grow maxWidth="50%" height="100%" borderLeft="level4" paddingLeft="md">
                    <Text as="h5" textAlign="center" size="lg">
                        Plate JSON
                    </Text>
                    <Box as="pre" overflowY="scroll" className={codeBlock}>
                        <code>{JSON.stringify(editorChildren, null, 2)}</code>
                    </Box>
                </Box>
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
                            <tr key={`kbdevent-${index}`}>
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
        </>
    )
}
