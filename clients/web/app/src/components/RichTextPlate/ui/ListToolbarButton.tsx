import React from 'react'
import { ListStyleType } from '@udecode/plate-indent-list'
import {
    ELEMENT_OL,
    ELEMENT_UL,
    useListToolbarButton,
    useListToolbarButtonState,
} from '@udecode/plate-list'
import { withRef } from '@udecode/cn'
import { IconButton, IconName } from '@ui'

type Props = {
    nodeType: ListStyleType
    icon: IconName
    tooltip: React.ReactNode
}

export const ListToolbarButton = withRef<
    React.FC<Props>,
    {
        nodeType?: ListStyleType
    }
>(({ nodeType = ListStyleType.Disc, icon, tooltip }, ref) => {
    const state = useListToolbarButtonState({
        nodeType: nodeType === ListStyleType.Disc ? ELEMENT_UL : ELEMENT_OL,
    })
    const { props } = useListToolbarButton(state)

    return (
        <IconButton
            opaque
            active={props.pressed}
            icon={icon}
            tooltip={tooltip}
            tooltipOptions={{ placement: 'vertical', immediate: true }}
            ref={ref}
            onClick={props.onClick}
            onMouseDown={props.onMouseDown}
        />
    )
})
