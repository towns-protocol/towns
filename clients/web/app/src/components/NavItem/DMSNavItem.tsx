import React from 'react'
import { Icon } from '@ui'
import { PATHS } from 'routes'
import { NavItem } from './_NavItem'

export const DMSNavItem = () => {
    return (
        <NavItem
            centerContent
            id="messages"
            to={`/${PATHS.MESSAGES}`}
            activeBackground="level3"
            tooltip="Direct Messages"
            tooltipOptions={{
                placement: 'horizontal',
                immediate: true,
            }}
        >
            <Icon type="dm" size="square_lg" background="level2" color="gray2" />
        </NavItem>
    )
}
