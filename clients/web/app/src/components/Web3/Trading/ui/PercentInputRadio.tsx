import React, { useCallback, useRef } from 'react'

import { Box, BoxProps, Text, TextField } from '@ui'

const validateValue = (value: string) => {
    const parsed = Number(value)
    return isNaN(parsed) ? '0' : Math.min(Math.max(Math.round(parsed), 0), 100).toString()
}

const percent = (
    <Text color="peach" fontWeight="medium">
        %
    </Text>
)

export const PercentInputRadio = (props: {
    color: BoxProps['color']
    onChange: (value: number) => void
}) => {
    const textRef = useRef<HTMLInputElement>(null)
    const onSelect = useCallback(() => {
        textRef.current?.focus()
    }, [])

    const onBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        e.target.value = validateValue(e.target.value)
    }, [])

    const onChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            props.onChange(Number(validateValue(e.target.value)))
        },
        [props],
    )

    return (
        <Box horizontal color="peach" onClick={onSelect}>
            <TextField
                min={0}
                max={100}
                step={1}
                ref={textRef}
                type="number"
                rounded="md"
                height="x4"
                background="level2"
                placeholder="Custom"
                before={percent}
                color="peach"
                onBlur={onBlur}
                onChange={onChange}
            />
        </Box>
    )
}
