import React, { useCallback, useEffect } from 'react'
import { Box, Checkbox, Paragraph, Stack, Text } from '@ui'
import { DEFAULT_UNPACK_ENVELOPE_OPTS, useStore } from 'store/store'
import { TownNotificationsButton } from '@components/NotificationSettings/NotificationsSettingsButton'

export function UserPreferences() {
    return (
        <>
            <Stack padding gap elevate background="level2" rounded="sm">
                <Box display="flex">
                    <Text fontWeight="strong" color="default">
                        Direct Message Notifications
                    </Text>
                </Box>
                <TownNotificationsButton type="dmGlobal" />
            </Stack>
            <Stack padding elevate gap background="level2" rounded="sm">
                <Box display="flex">
                    <Text fontWeight="strong" color="default">
                        Group Message Notifications
                    </Text>
                </Box>
                <TownNotificationsButton type="gdmGlobal" />
            </Stack>
            <EventSignatureValidationCheckbox />
        </>
    )
}

const EventSignatureValidationCheckbox = () => {
    const { unpackEnvelopeOpts, setUnpackEnvelopeOpts } = useStore()
    const opts = unpackEnvelopeOpts ?? DEFAULT_UNPACK_ENVELOPE_OPTS
    const strict = opts.disableSignatureValidation !== true
    const header = 'Security'
    const key = 'strict'
    const label = 'Strict Mode (Requires refresh)'

    useEffect(() => {
        console.log('unpackEnvelopeOpts', opts)
    }, [opts])

    const changeStrictMode = useCallback(
        (strict: boolean) => (e: React.ChangeEvent<HTMLInputElement>) => {
            setUnpackEnvelopeOpts({ ...opts, disableSignatureValidation: !strict })
        },
        [setUnpackEnvelopeOpts, opts],
    )

    return (
        <Stack padding gap background="level2" rounded="sm">
            <Box display="flex">
                <Text fontWeight="strong" color="default">
                    {header}
                </Text>
            </Box>

            <Checkbox
                labelLast
                defaultChecked
                justifyContent="start"
                key={key}
                checked={strict}
                name={key}
                label={label}
                onChange={changeStrictMode(!strict)}
            />
            <Paragraph size="sm" color="gray2">
                If Strict Mode is enabled, the client will validate the signatures of all events
                when they are received. If not enabled, signatures will only be evaluated when users
                request keys in an encrypted group chat. A compliant river node will validate all
                signatures and will not forward invalid events. A message signature can be
                re-validated via the message modal.
            </Paragraph>
        </Stack>
    )
}
