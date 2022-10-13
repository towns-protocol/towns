import { Variants, motion } from 'framer-motion'
import React, { ButtonHTMLAttributes } from 'react'
import { Box, BoxProps } from '@ui'
import { vars } from 'ui/styles/vars.css'
import { Icon, IconName } from '../Icon'
import { ButtonStyleVariants, buttonStyle } from './Button.css'

type StyleProps = Omit<NonNullable<ButtonStyleVariants>, 'active'>

type Props = {
    children?: React.ReactNode
    tone?: keyof typeof vars.color.background
    icon?: IconName
    disabled?: boolean
    minWidth?: BoxProps['minWidth']
    animate?: boolean
    onClick?: (e: React.MouseEvent) => void
} & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'onDrag' | 'onDragEnd' | 'onDragStart' | 'onAnimationStart' | 'size' | 'color'
> &
    StyleProps

export const Button = ({
    animate = true,
    size = 'button_md',
    disabled,
    tone = 'level3',
    icon,
    children,
    onClick,
    ...inputProps
}: Props) => (
    <MotionStack
        horizontal
        layout={animate}
        as="button"
        cursor={disabled ? 'default' : 'pointer'}
        className={buttonStyle({ size })}
        justifyContent="center"
        alignItems="center"
        background={tone}
        variants={buttonVariants}
        whileHover="hover"
        onClick={onClick}
        {...inputProps}
    >
        {icon && <Icon type={icon} size="square_inline" />}
        {children}
    </MotionStack>
)

const buttonVariants: Variants = {
    hover: {
        // border: `0 0 0 1px ${Figma.Colors.Orange}`,
    },
}

const MotionStack = motion(Box)
