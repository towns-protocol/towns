import React, { useCallback } from 'react'
import { TPlateEditor } from '@udecode/plate-common/react'
import { unwrapCodeBlock } from '@udecode/plate-code-block'
import { useListToolbarButtonState } from '@udecode/plate-list/react'
import { withRef } from '@udecode/cn'
import { BaseBulletedListPlugin, BaseNumberedListPlugin, toggleList } from '@udecode/plate-list'
import { IconButton, IconName } from '@ui'
import { isCodeBlockElement } from '../../utils/helpers'

type Props = {
    nodeType: typeof BaseBulletedListPlugin.key | typeof BaseNumberedListPlugin.key
    icon: IconName
    tooltip: React.ReactNode
    editor: TPlateEditor
}

export const ListToolbarButton = withRef<
    React.FC<Props>,
    {
        nodeType?: Props['nodeType']
    }
>(({ nodeType: _nodeType = BaseBulletedListPlugin.key, icon, tooltip, editor }, ref) => {
    const { pressed } = useListToolbarButtonState({
        nodeType: _nodeType,
    })

    const onClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            if (isCodeBlockElement(editor)) {
                unwrapCodeBlock(editor)
            }
            toggleList(editor, { type: _nodeType })
        },
        [_nodeType, editor],
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
