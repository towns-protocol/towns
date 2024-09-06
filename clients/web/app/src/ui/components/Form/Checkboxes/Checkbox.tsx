import React from 'react'
import { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { Box, BoxProps } from 'ui/components/Box/Box'
import { CheckIcon } from 'ui/components/Icon'
import { Paragraph } from 'ui/components/Text/Paragraph'
import * as style from './Checkbox.css'

type Props<HookFormValues extends FieldValues> = {
    name: Path<HookFormValues>
    label?: string | React.ReactNode
    value?: string
    width?: BoxProps['width']
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    onClick?: (e: React.MouseEvent<HTMLInputElement>) => void
    readOnly?: boolean
    disabled?: boolean
    checked?: boolean
    defaultChecked?: boolean
    labelLast?: boolean
} & Partial<UseFormReturn<HookFormValues>> &
    Pick<BoxProps, 'justifyContent' | 'display'>

export const Checkbox = <HookFormValues extends FieldValues>(props: Props<HookFormValues>) => {
    const {
        name,
        label,
        value,
        register,
        width,
        labelLast,
        display = 'flex',
        justifyContent = 'spaceBetween',
    } = props
    const { onChange, ...registerProps } = register?.(name) || {}
    const _value =
        !value && typeof label === 'string' ? label.replace(' ', '').toLowerCase() : value
    return (
        <Box display="block">
            <Box
                as="label"
                flexDirection="row"
                display={display}
                width={width || 'auto'}
                alignItems="center"
                cursor="pointer"
                justifyContent={justifyContent}
            >
                {!labelLast && (
                    <Box paddingRight="md">
                        {typeof label === 'string' ? <Paragraph>{label}</Paragraph> : label}
                    </Box>
                )}
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
                {labelLast && (
                    <Box paddingLeft="sm">
                        {typeof label === 'string' ? <Paragraph>{label}</Paragraph> : label}
                    </Box>
                )}
            </Box>
        </Box>
    )
}
