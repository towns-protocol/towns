import React from 'react'
import { useEvent } from 'react-use-event-hook'
import { IconLabelButton, Stack } from '@ui'

type Props = {
    label: string
    data: string[]
    onClick: () => void
    onUpdate: (data: string[]) => void
    itemRenderer: (props: { item: string; onRemoveItem: (id: string) => void }) => React.ReactNode
}

// TODO: this can probably be combined with TokenSelector with a generic type
export const MemberSelector = (props: Props) => {
    const { data, itemRenderer } = props

    const onRemoveItem = useEvent((id: string) => {
        props.onUpdate(data.filter((item) => item !== id))
    })

    return (
        <>
            <Stack horizontal gap flexWrap="wrap" alignItems="start">
                {Object.values(data).map((item) => (
                    <React.Fragment key={item}>
                        {itemRenderer({ item, onRemoveItem })}
                    </React.Fragment>
                ))}
            </Stack>
            <Stack alignItems="start">
                <IconLabelButton label={props.label} type="plus" onClick={props.onClick} />
            </Stack>
        </>
    )
}
