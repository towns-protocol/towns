import React from 'react'
import { Icon, Stack, TextField } from '@ui'

type Props = {
    size?: 'input_md' | 'input_lg'
    onChange?: React.EventHandler<React.ChangeEvent<HTMLInputElement>>
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
    value?: string | number
}

export const MessageInput = (props: Props) => {
    const { size = 'input_lg', onChange, onKeyDown, ...boxProps } = props
    return (
        <Stack grow horizontal>
            <TextField
                paddingX="sm"
                background="level1"
                placeholder="Write a reply here..."
                height={size}
                after={<Icon type="plus" color="gray2" size="square_sm" />}
                onChange={onChange}
                onKeyDown={onKeyDown}
                {...boxProps}
            />
        </Stack>
    )
}
