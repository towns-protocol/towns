import { AnimatePresence, motion } from 'framer-motion'
import React, { useState } from 'react'
import useEvent from 'react-use-event-hook'
import { Button, Heading, Paragraph, Stack } from '@ui'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { atoms } from 'ui/styles/atoms.css'
import { SpaceSettingsChange } from './store/hooks/useSpaceSettingChanges'

type Props = {
    spaceSettingChanges: SpaceSettingsChange[]
}

export const SpaceSettingsNotifications = (props: Props) => {
    const { spaceSettingChanges } = props
    const [showSavePopup, setShowSavePopup] = useState(false)

    const onSave = useEvent(() => {
        setShowSavePopup(true)
    })
    const onHidePopup = useEvent(() => {
        setShowSavePopup(false)
    })

    return (
        <>
            <Stack position="absolute" bottom="md" left="md" right="md">
                <AnimatePresence>
                    {!!spaceSettingChanges.length && (
                        <motion.div {...notificationMotion}>
                            <MotionNotification onSave={onSave}>
                                <Paragraph color="cta1">
                                    You have unsaved changes ({spaceSettingChanges.length})
                                </Paragraph>
                                <Paragraph color="gray2">
                                    Last saved by{' '}
                                    <span className={atoms({ color: 'default' })}>tak.eth</span>
                                </Paragraph>
                            </MotionNotification>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Stack>
            {showSavePopup ? (
                <ModalContainer onHide={onHidePopup}>
                    <SavePopup changes={spaceSettingChanges} onCancel={onHidePopup} />
                </ModalContainer>
            ) : null}
        </>
    )
}

const SavePopup = (props: {
    onCancel: () => void
    changes: { title: string; description: string }[]
}) => {
    const onSave = useEvent(() => {
        //saving
    })
    return (
        <Stack gap="lg">
            <Heading level={3}>Confirm your changes</Heading>
            <Stack gap="sm">
                {props.changes.map((change) => (
                    <Stack padding key={change.description} background="level2" rounded="sm">
                        <Paragraph>{change.title}</Paragraph>
                        <Paragraph color="gray2">{change.description}</Paragraph>
                    </Stack>
                ))}
            </Stack>
            <Stack horizontal gap justifyContent="end">
                <Button tone="level2" value="Cancel" onClick={props.onCancel}>
                    Cancel
                </Button>
                <Button icon="wallet" tone="cta1" value="Save" onClick={onSave}>
                    Save on chain
                </Button>
            </Stack>
        </Stack>
    )
}

const Notification = (props: { children: React.ReactNode; onSave: () => void }) => {
    return (
        <Stack horizontal gap padding grow position="relative" background="level3" rounded="sm">
            <Stack grow justifyContent="center">
                {props.children}
            </Stack>
            <Stack horizontal gap>
                <Button tone="cta1" icon="wallet" value="Save on chain" onClick={props.onSave}>
                    Save on chain
                </Button>
            </Stack>
        </Stack>
    )
}

const notificationMotion = {
    variants: {
        hide: { opacity: 0, y: 80 },
        show: { opacity: 1, y: 0 },
    },
    initial: 'hide',
    animate: 'show',
    exit: 'hide',
}

const MotionNotification = motion(Notification)
