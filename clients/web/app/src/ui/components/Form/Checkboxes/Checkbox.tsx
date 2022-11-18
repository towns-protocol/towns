import React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Box } from 'ui/components/Box/Box'
import { CheckIcon } from 'ui/components/Icon'
import * as style from './Checkbox.css'

type Props = {
    name: string
    label: string | React.ReactNode
    value?: string
} & Partial<UseFormReturn>

export const Checkbox = (props: Props) => {
    const { name, label, value, register } = props
    const _value =
        !value && typeof label === 'string' ? label.replace(' ', '').toLowerCase() : value
    return (
        <Box display="block">
            <Box
                as="label"
                flexDirection="row"
                display="inline-flex"
                width="auto"
                alignItems="center"
                cursor="pointer"
            >
                <Box paddingRight="md">{label}</Box>
                <Box className={style.checkboxWrapper}>
                    <input
                        className={style.hiddenCheckbox}
                        type="checkbox"
                        value={_value}
                        {...register?.(name)}
                    />
                    <CheckIcon className={style.svg} />
                </Box>
            </Box>
        </Box>
    )
}
