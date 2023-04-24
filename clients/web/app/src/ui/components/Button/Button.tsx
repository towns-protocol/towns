import React, { ButtonHTMLAttributes, forwardRef } from 'react'
import { vars } from 'ui/styles/vars.css'
import { BoxProps } from '../Box/Box'
import { Icon, IconName } from '../Icon'
import { ButtonStyleVariants, buttonStyle } from './Button.css'
import { MotionStack } from '../Motion/MotionBox'

type StyleProps = Omit<NonNullable<ButtonStyleVariants>, 'active'>

type Props = {
    children?: React.ReactNode
    tone?: keyof typeof vars.color.background
    icon?: IconName
    disabled?: boolean
    minWidth?: BoxProps['minWidth']
    width?: BoxProps['width']
    animate?: boolean
    onClick?: (e: React.MouseEvent) => void
} & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'onDrag' | 'onDragEnd' | 'onDragStart' | 'onAnimationStart' | 'size' | 'color'
> &
    StyleProps &
    Pick<BoxProps, 'aspectRatio' | 'color' | 'fontWeight' | 'inset' | 'insetX' | 'insetY'>

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
            icon,
            children,
            onClick,
            ...inputProps
        },
        ref,
    ) => (
        <MotionStack
            horizontal
            layout={animate}
            aspectRatio={aspectRatio}
            as="button"
            cursor={disabled ? 'default' : 'pointer'}
            className={buttonStyle({
                size,
                rounded,
                hoverEffect,
                // a tone can be specified here in order to transition background
                tone: animate || tone == 'level3' ? tone : undefined,
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
