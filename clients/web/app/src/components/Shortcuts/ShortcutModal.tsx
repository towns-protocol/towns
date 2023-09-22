import React, { useState } from 'react'

import { ModalContainer } from '@components/Modals/ModalContainer'
import { Divider, Heading, Stack } from '@ui'
import { Shortcuts } from 'data/shortcuts'
import { useShortcut } from 'hooks/useShortcut'
import { DisplayShortcutRow } from './ShortcutKeys'
export const ShortcutModal = () => {
    const [showing, setShowing] = useState(false)

    useShortcut('DisplayShortcutModal', () => {
        setShowing((s) => !s)
    })

    const onHide = () => {
        setShowing(false)
    }

    return (
        showing && (
            <ModalContainer onHide={onHide}>
                <Stack gap="lg" style={{ maxHeight: `calc(100vh - 64px)` }}>
                    <Heading level={3}>Keyboard Shortcuts</Heading>
                    <Stack scroll gap="lg">
                        {(Object.keys(Shortcuts) as Array<keyof typeof Shortcuts>).map((group) => (
                            <Stack key={group}>
                                <Heading level={4}>{group}</Heading>
                                <Divider space="md" />
                                <Stack insetTop="xs">
                                    {Object.values(Shortcuts[group]).map((shortcut) => (
                                        <Row
                                            key={shortcut.keys}
                                            shortcut={shortcut.keys}
                                            description={shortcut.description}
                                        />
                                    ))}
                                </Stack>
                            </Stack>
                        ))}
                    </Stack>
                </Stack>
            </ModalContainer>
        )
    )
}

const Row = (props: { shortcut: string | string[]; description: React.ReactNode }) => {
    const shortcuts = Array.isArray(props.shortcut) ? props.shortcut : [props.shortcut]

    return (
        <Stack horizontal justifyContent="spaceBetween" alignItems="center" paddingY="xs">
            <DisplayShortcutRow description={props.description} shortcuts={shortcuts} />
        </Stack>
    )
}
