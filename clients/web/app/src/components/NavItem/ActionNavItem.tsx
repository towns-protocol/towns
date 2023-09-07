import React from 'react'
import { ButtonText, Stack } from '@ui'
import { Icon, IconName } from 'ui/components/Icon'
import { TooltipOptions } from 'ui/components/Tooltip/TooltipRenderer'
import { NavItem } from './_NavItem'

export const ActionNavItem = (props: {
    id?: string
    badge?: React.ReactNode
    label: string
    link?: string
    icon?: IconName
    highlight?: boolean
    tooltip?: React.ReactNode
    tooltipOptions?: TooltipOptions
    onClick?: (e: React.MouseEvent) => void
    children?: React.ReactNode
}) => {
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
        children,
    } = props
    return (
        <NavItem
            tooltip={tooltip}
            tooltipOptions={tooltipOptions}
            to={link}
            id={id}
            exact={false}
            cursor="pointer"
            onClick={onClick}
        >
            {icon && (
                <Icon
                    type={icon}
                    padding="line"
                    background="level2"
                    color="gray2"
                    size="square_lg"
                />
            )}
            <ButtonText
                fontWeight={isHighlight ? 'strong' : undefined}
                color={isHighlight ? 'default' : undefined}
            >
                {label}
            </ButtonText>
            <Stack horizontal grow justifyContent="end">
                {badge}
            </Stack>
            {children}
        </NavItem>
    )
}
