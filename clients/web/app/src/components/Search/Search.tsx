import React, { forwardRef } from 'react'
import { Box, BoxProps, Icon, IconButton, TextField } from '@ui'
import { FieldBaseProps } from 'ui/components/_internal/Field/Field'

type Props = {
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    placeholder?: string
    value?: string
    width?: BoxProps['width']
    onClearClick: () => void
} & FieldBaseProps

const ClearButton = ({
    value,
    onClearClick,
}: {
    value?: Props['value']
    onClearClick: Props['onClearClick']
}) => {
    function onClick(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        e.stopPropagation()
        onClearClick()
    }

    if (!value) {
        return null
    }
    return <IconButton icon="close" onClick={onClick} />
}

export const Search = forwardRef<HTMLInputElement, Props>((props, ref) => {
    const { placeholder = 'Search ...', onChange, value, width = '200', onClearClick } = props
    return (
        <Box shrink width={width}>
            <TextField
                ref={ref}
                height="input_md"
                background="level3"
                before={<Icon type="search" />}
                after={<ClearButton value={value} onClearClick={onClearClick} />}
                placeholder={placeholder}
                value={value ?? undefined}
                onChange={onChange}
            />
        </Box>
    )
})
