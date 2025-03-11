import React, { useCallback, useRef } from 'react'

import { Box, Text, TextField } from '@ui'

export const PercentInputRadio = (props: { onChange: (value: number) => void }) => {
    const textRef = useRef<HTMLInputElement>(null)
    const onSelect = useCallback(() => {
        textRef.current?.focus()
    }, [])
    return (
        <Box horizontal color="peach" onClick={onSelect}>
            <TextField
                min={0}
                max={100}
                ref={textRef}
                type="number"
                rounded="md"
                height="x4"
                background="level2"
                placeholder="Custom"
                before={
                    <Text color="peach" fontWeight="medium">
                        %
                    </Text>
                }
                onChange={(e) => props.onChange(Number(e.target.value))}
            />
        </Box>
    )
}
