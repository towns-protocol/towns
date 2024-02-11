import React, { ButtonHTMLAttributes, forwardRef } from 'react'
import { BoxProps } from '../Box/Box'
import { Icon, IconName } from '../Icon'
import { ButtonStyleVariants, buttonStyle } from './Button.css'
import { MotionStack } from '../Motion/MotionComponents'

type StyleProps = Omit<NonNullable<ButtonStyleVariants>, 'active'>

type Props = {
    children?: React.ReactNode
    tone?: BoxProps['background']
    icon?: IconName
    disabled?: boolean
    minWidth?: BoxProps['minWidth']
    width?: BoxProps['width']
    animate?: boolean
    type?: 'button' | 'submit' | 'reset'
    onClick?: (e: React.MouseEvent) => void
} & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'onDrag' | 'onDragEnd' | 'onDragStart' | 'onAnimationStart' | 'size' | 'color'
> &
    StyleProps &
    Pick<
        BoxProps,
        | 'grow'
        | 'aspectRatio'
        | 'color'
        | 'fontWeight'
        | 'inset'
        | 'insetX'
        | 'insetY'
        | 'border'
        | 'justifyContent'
    >

export type ButtonProps = Props

export const Button = forwardRef<HTMLButtonElement, Props>(
    (
        {
            aspectRatio,
            animate = false,
            size = 'button_md',
            rounded,
            disabled,
            hoverEffect,
            tone = 'level3',
            type = 'button',
            icon,
            children,
            onClick,
            ...inputProps
        },
        ref,
    ) => (
        <MotionStack
            horizontal
            hoverable
            layout={animate}
            aspectRatio={aspectRatio}
            as="button"
            type={type}
            cursor={disabled ? 'default' : 'pointer'}
            className={buttonStyle({
                size,
                rounded,
                hoverEffect,
                border: inputProps.border,
                // a tone can be specified here in order to transition background
                // tone: animate || tone == 'level3' ? tone : undefined,
            })}
            justifyContent="center"
            alignItems="center"
            background={tone}
            whileHover="hover"
            disabled={disabled}
            onClick={onClick}
            {...inputProps}
            ref={ref}
        >
            {icon && <Icon type={icon} size="square_inline" />}
            {children}
        </MotionStack>
    ),
)
