import React from 'react'
import { useMarkToolbarButton, useMarkToolbarButtonState } from '@udecode/plate-common'
import { IconButton } from '@ui'
import { IconName } from 'ui/components/Icon'

type Props = {
    nodeType: string
    icon: IconName
    tooltip: React.ReactNode
    clear?: string | string[]
    onClick?: () => void
}
export const MarkToolbarButton = ({ clear, nodeType, icon, tooltip, onClick }: Props) => {
    const state = useMarkToolbarButtonState({ clear, nodeType })
    const { props } = useMarkToolbarButton(state)

    return (
        <IconButton
            opaque
            active={props.pressed}
            icon={icon}
            tooltip={tooltip}
            tooltipOptions={{ placement: 'vertical', immediate: true }}
            onClick={onClick ?? props.onClick}
        />
    )
}
