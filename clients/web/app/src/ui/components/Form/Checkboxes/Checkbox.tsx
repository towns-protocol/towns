import React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Box, BoxProps } from 'ui/components/Box/Box'
import { CheckIcon } from 'ui/components/Icon'
import * as style from './Checkbox.css'

type Props = {
    name: string
    label?: string | React.ReactNode
    value?: string
    width?: BoxProps['width']
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    onClick?: (e: React.MouseEvent<HTMLInputElement>) => void
    readOnly?: boolean
    disabled?: boolean
    checked?: boolean
    defaultChecked?: boolean
} & Partial<UseFormReturn>

export const Checkbox = (props: Props) => {
    const { name, label, value, register, width } = props
    const { onChange, ...registerProps } = register?.(name) || {}
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
                <Box className={style.checkboxWrapper} onClick={props.onClick}>
                    <input
                        data-testid={`checkbox-${name}`}
                        className={style.hiddenCheckbox}
                        type="checkbox"
                        defaultChecked={props.defaultChecked}
                        value={_value}
                        readOnly={props.readOnly}
                        disabled={props.disabled}
                        {...registerProps}
                        checked={props.checked}
                        onChange={props.onChange ?? onChange}
                    />
                    <CheckIcon className={style.svg} />
                </Box>
            </Box>
        </Box>
    )
}
