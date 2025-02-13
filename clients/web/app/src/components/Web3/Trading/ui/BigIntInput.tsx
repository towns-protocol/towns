import React, { useCallback, useEffect, useState } from 'react'
import { Icon, IconName, TextField } from '@ui'
import { formatUnits, parseUnits } from 'hooks/useBalance'

export const BigIntInput = (props: {
    icon: IconName
    decimals: number
    value: bigint | undefined
    onChange: (value: bigint) => void
}) => {
    const { icon, decimals, value: rawValue, onChange } = props
    const [displayValue, setDisplayValue] = useState('')

    useEffect(() => {
        if (!rawValue) {
            setDisplayValue('')
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
            paddingX
            rounded="full"
            background="level3"
            before={<Icon type={icon} size="square_xs" />}
            value={displayValue}
            placeholder="Custom Amount"
            onChange={onTextFieldChanged}
        />
    )
}
