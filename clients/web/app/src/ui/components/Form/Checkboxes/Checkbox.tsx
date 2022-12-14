import React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Box, BoxProps } from 'ui/components/Box/Box'
import { CheckIcon } from 'ui/components/Icon'
import * as style from './Checkbox.css'

type Props = {
    name: string
    label: string | React.ReactNode
    value?: string
    width?: BoxProps['width']
} & Partial<UseFormReturn>

export const Checkbox = (props: Props) => {
    const { name, label, value, register, width } = props
    const _value =
        !value && typeof label === 'string' ? label.replace(' ', '').toLowerCase() : value
    return (
        <Box display="block">
            <Box
                as="label"
                flexDirection="row"
                display="inline-flex"
                width={width || 'auto'}
                alignItems="center"
                cursor="pointer"
                justifyContent="spaceBetween"
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
