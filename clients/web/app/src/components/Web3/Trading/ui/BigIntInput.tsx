import React, { ComponentProps, useCallback, useEffect, useRef, useState } from 'react'
import useResizeObserver from '@react-hook/resize-observer'
import { Box, Icon, IconName, TextField } from '@ui'
import { formatUnits, parseUnits } from 'hooks/useBalance'

type Props = {
    icon?: IconName
    decimals: number
    value: bigint | undefined
    onChange: (value: bigint) => void
    onSelect?: () => void
} & Omit<ComponentProps<typeof TextField>, 'onChange' | 'value'>

export const BigIntInput = (props: Props) => {
    const { icon, decimals, value: rawValue, onChange, ...inputProps } = props
    const [displayValue, setDisplayValue] = useState('')

    useEffect(() => {
        if (typeof rawValue === 'undefined') {
            return
        }
        try {
            const formatted = formatUnits(rawValue, decimals)
            setDisplayValue(formatted)
        } catch (error) {
            console.error('Error formatting raw value:', error)
            setDisplayValue('')
        }
    }, [rawValue, decimals])

    const onTextFieldChanged = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputValue = e.target.value
            setDisplayValue(inputValue)
            if (inputValue === '') {
                onChange(0n)
                return
            }
            try {
                const rawValue = BigInt(parseUnits(inputValue, decimals))
                onChange(rawValue)
            } catch (error) {
                console.log('Error parsing input', error)
            }
        },
        [onChange, setDisplayValue, decimals],
    )
    const measureRef = useRef<HTMLDivElement>(null)
    const textRef = useRef<HTMLInputElement>(null)

    useResizeObserver(measureRef, (entry) => {
        if (textRef.current) {
            textRef.current.style.width = `${entry.contentRect.width}px`
        }
    })

    const onSelect = useCallback(() => {
        textRef.current?.focus()
    }, [])

    return (
        <Box onClick={onSelect}>
            <TextField
                ref={textRef}
                background="level2"
                paddingX="md"
                rounded="full"
                before={icon ? <Icon type={icon} size="square_xs" /> : undefined}
                value={displayValue}
                height="x4"
                style={{ width: 100, minWidth: !displayValue ? 55 : 33 }}
                maxWidth="x20"
                onFocus={props.onSelect}
                onChange={onTextFieldChanged}
                {...inputProps}
            />
            <div style={{ position: 'absolute', left: -1000, top: -1000 }} ref={measureRef}>
                {displayValue}
            </div>
        </Box>
    )
}
