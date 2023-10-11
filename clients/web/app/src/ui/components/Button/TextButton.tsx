import React from 'react'
import { ButtonTextProps } from '../Text/ButtonText'
import { Button, ButtonProps } from './Button'

export const TextButton = ({
    children,
    size = 'sm',
    ...buttonProps
}: Omit<ButtonProps, 'size'> & { size?: ButtonTextProps['size'] }) => {
    return (
        <Button
            hoverEffect="none"
            insetX="xs"
            insetY="xs"
            size="button_xs"
            tone="none"
            animate={false}
            color={{ default: 'gray2', hover: 'default' }}
            {...buttonProps}
        >
            {children}
        </Button>
    )
}
