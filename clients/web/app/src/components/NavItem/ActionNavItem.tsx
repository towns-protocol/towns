import React from 'react'
import { BoxProps, ButtonText, Stack } from '@ui'
import { Icon, IconName } from 'ui/components/Icon'
import { TooltipOptions } from 'ui/components/Tooltip/TooltipRenderer'
import { NavItem } from './_NavItem'

type Props = {
    id?: string
    badge?: React.ReactNode
    label?: React.ReactNode
    link?: string
    icon?: IconName | React.ReactNode
    highlight?: boolean
    tooltip?: React.ReactNode
    tooltipOptions?: TooltipOptions
    minHeight?: BoxProps['minHeight']
    onClick?: (e: React.MouseEvent) => void
    children?: React.ReactNode
}

export const ActionNavItem = (props: Props) => {
    const {
        icon,
        id,
        link,
        highlight: isHighlight,
        label,
        badge,
        onClick,
        tooltip,
        tooltipOptions,
        minHeight,
        children,
    } = props

    const isIconName = (icon: Props['icon']): icon is IconName => typeof icon === 'string'

    return (
        <NavItem
            tooltip={tooltip}
            tooltipOptions={tooltipOptions}
            to={link}
            id={id}
            exact={false}
            cursor="pointer"
            paddingY="xxs"
            minHeight={minHeight}
            onClick={onClick}
        >
            {(isIconName(icon) && (
                <Icon
                    type={icon}
                    padding="line"
                    background="level2"
                    color="gray2"
                    size="square_lg"
                />
            )) ||
                icon}
            {!!label && (
                <ButtonText
                    fontWeight={isHighlight ? 'strong' : undefined}
                    color={isHighlight ? 'default' : undefined}
                >
                    {label}
                </ButtonText>
            )}
            {!!badge && (
                <Stack horizontal grow justifyContent="end">
                    {badge}
                </Stack>
            )}
            {children}
        </NavItem>
    )
}
