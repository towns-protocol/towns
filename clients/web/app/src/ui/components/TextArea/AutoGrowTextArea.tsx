import React, { forwardRef, useLayoutEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { Box } from '../Box/Box'
import { grow } from './TextArea.css'
import { TextArea, Props as TextAreaProps } from './TextArea'

type Props = {
    text: string | undefined
} & TextAreaProps

export const AutoGrowTextArea = forwardRef<HTMLTextAreaElement, Props>(
    ({ text, ...textAreaProps }, ref) => {
        const { maxWidth, fontSize, style, minHeight } = textAreaProps
        const heightRef = useRef<HTMLDivElement>(null)
        const [height, setHeight] = useState<number | undefined>(undefined)

        useLayoutEffect(() => {
            if (heightRef.current) {
                setHeight(heightRef.current.clientHeight)
            }
        }, [text])
        return (
            <Box display="block" position="relative" maxWidth={maxWidth}>
                <Box
                    position="absolute"
                    display="block"
                    ref={heightRef}
                    width="100%"
                    fontSize={fontSize}
                    style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        ...style,
                    }}
                    visibility="hidden"
                    className={clsx([grow])}
                >
                    {text?.length ? text : ' '}
                </Box>
                <Box display="block" className={clsx([grow])}>
                    <TextArea
                        ref={ref}
                        {...textAreaProps}
                        style={{
                            ...style,
                            height,
                        }}
                        minHeight={minHeight}
                    />
                </Box>
            </Box>
        )
    },
)
