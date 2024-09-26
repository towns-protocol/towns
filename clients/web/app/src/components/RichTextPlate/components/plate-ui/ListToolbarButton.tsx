import React, { useCallback } from 'react'
import { PlateEditor, Value, collapseSelection } from '@udecode/plate-common'
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
    editor: PlateEditor<Value>
}

export const ListToolbarButton = withRef<
    React.FC<Props>,
    {
        nodeType?: ListStyleType
    }
>(({ nodeType: _nodeType = ListStyleType.Disc, icon, tooltip, editor }, ref) => {
    const { pressed, nodeType } = useListToolbarButtonState({
        nodeType: _nodeType === ListStyleType.Disc ? ELEMENT_UL : ELEMENT_OL,
    })

    const { props } = useListToolbarButton({ nodeType, pressed })

    const onClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            props.onClick()
            collapseSelection(editor)
        },
        [props, editor],
    )

    return (
        <IconButton
            opaque
            active={pressed}
            icon={icon}
            tooltip={tooltip}
            tooltipOptions={{ placement: 'vertical', immediate: true }}
            ref={ref}
            onClick={onClick}
            onMouseDown={onClick}
        />
    )
})
