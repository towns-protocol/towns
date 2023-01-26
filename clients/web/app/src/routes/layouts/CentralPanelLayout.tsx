import { Allotment } from 'allotment'
import { useOutlet } from 'react-router'
import React from 'react'
import { Stack } from '@ui'
import { usePersistPanes } from 'hooks/usePersistPanes'

export const CentralPanelLayout = (props: { children: React.ReactNode }) => {
    const { children } = props
    const { sizes, onSizesChange } = usePersistPanes(['channel', 'right'])
    const outlet = useOutlet()
    return (
        <Stack horizontal minHeight="100%">
            <Allotment onChange={onSizesChange}>
                <Allotment.Pane minSize={550}>{children}</Allotment.Pane>
                {outlet && (
                    <Allotment.Pane minSize={300} preferredSize={sizes[1] || 840}>
                        {outlet}
                    </Allotment.Pane>
                )}
            </Allotment>
        </Stack>
    )
}
