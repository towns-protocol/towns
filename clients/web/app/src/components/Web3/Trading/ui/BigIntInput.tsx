import React, { ComponentProps, useCallback, useEffect, useState } from 'react'
import { Icon, IconName, TextField } from '@ui'
import { formatUnits, parseUnits } from 'hooks/useBalance'

type Props = {
    icon: IconName
    decimals: number
    value: bigint | undefined
    onChange: (value: bigint) => void
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
    return (
        <TextField
            background="level2"
            paddingX="md"
            rounded="full"
            before={<Icon type={icon} size="square_xs" />}
            value={displayValue}
            height="x5"
            style={{ width: '100%', minWidth: 55 }}
            maxWidth="x20"
            onChange={onTextFieldChanged}
            {...inputProps}
        />
    )
}
