import React, { ComponentProps, useCallback, useEffect, useRef, useState } from 'react'
import useResizeObserver from '@react-hook/resize-observer'
import { Box, BoxProps, Icon, IconName, TextField } from '@ui'
import { formatUnits, parseUnits } from 'hooks/useBalance'

type Props = {
    icon?: IconName
    decimals: number
    defaultValue: bigint | undefined
    onChange: (value: bigint) => void
    onSelect?: () => void
    color?: BoxProps['color']
    compact?: boolean
} & Omit<ComponentProps<typeof TextField>, 'onChange' | 'value' | 'defaultValue'>

export const NumberInputRadio = (props: Props) => {
    const { icon, decimals, defaultValue, onChange, color, compact, ...inputProps } = props
    const [value, setValue] = useState('')
    const [errored, setErrored] = useState(false)

    const valueRef = useRef(value)
    valueRef.current = value

    const erroredRef = useRef(errored)
    erroredRef.current = errored

    useEffect(() => {
        if (typeof defaultValue === 'undefined') {
            setValue('')
            return
        }

        if (defaultValue === 0n && erroredRef.current) {
            // prevent from showing 0 when there is an error
            // let user edit the value
            return
        }

        const formatted = formatUnits(defaultValue, decimals)

        if (
            Number(formatted) === Number(valueRef.current) &&
            valueRef.current?.match(/^\d+\.\d*0+$/)
        ) {
            // prevent from reformatting and removing trailing zeros while inputting
            // values like 0.000
            return
        }

        try {
            setValue(formatted)
        } catch (error) {
            console.error('Error formatting raw value:', error)
            setValue('')
        }
    }, [defaultValue, decimals])

    const onTextFieldChanged = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputValue = e.target.value
            setValue(inputValue)
            if (inputValue === '') {
                onChange(0n)
                return
            }
            try {
                const rawValue = BigInt(parseUnits(inputValue, decimals))
                onChange(rawValue)
                setErrored(false)
            } catch (error) {
                console.log('Error parsing input', error)
                setErrored(true)
                onChange(0n)
            }
        },
        [onChange, setValue, decimals],
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
                background={errored ? 'negativeSubtle' : 'level2'}
                tone={errored ? 'negative' : 'neutral'}
                paddingX="md"
                rounded="full"
                before={
                    icon ? (
                        <Icon
                            type={icon}
                            size={compact ? 'square_xxs' : 'square_xs'}
                            insetX="xxs"
                        />
                    ) : undefined
                }
                value={value}
                height="x4"
                style={{ width: 100, minWidth: 55 }}
                maxWidth="x20"
                color={color}
                onFocus={props.onSelect}
                onChange={onTextFieldChanged}
                {...inputProps}
            />
            <div style={{ position: 'absolute', left: -1000, top: -1000 }} ref={measureRef}>
                {value}
            </div>
        </Box>
    )
}
