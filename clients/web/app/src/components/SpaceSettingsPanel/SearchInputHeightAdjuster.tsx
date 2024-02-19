import React, { useRef } from 'react'
import { Stack } from '@ui'

export function SearchInputHeightAdjuster({
    children,
}: {
    children: (inputContainerRef: React.RefObject<HTMLDivElement>) => React.ReactNode
}) {
    const inputContainerRef = useRef<HTMLDivElement>(null)

    return (
        <Stack position="relative">
            {/* default to 48 px, the height of the text input */}
            <Stack style={{ height: inputContainerRef.current?.clientHeight ?? 48 }} />
            {/* absolute so dropdown flows over rest of form */}
            <Stack position="absolute" left="none" right="none" overflow="visible">
                {children(inputContainerRef)}
            </Stack>
        </Stack>
    )
}
