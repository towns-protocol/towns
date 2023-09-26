import React from 'react'
import { Tooltip } from '@ui'
import { ShortcutAction, ShortcutActions } from 'data/shortcuts'
import { DisplayShortcutRow } from './ShortcutKeys'

export const ShortcutTooltip = (props: { action: ShortcutAction }) => {
    const action = ShortcutActions[props.action]
    // pick the first shortcut only for tooltips
    const keys: string[] = [Array.isArray(action.keys) ? action.keys[0] : action.keys]
    return (
        <Tooltip horizontal gap="sm" alignItems="center">
            <DisplayShortcutRow description={action.description} shortcuts={keys} size="sm" />
        </Tooltip>
    )
}
