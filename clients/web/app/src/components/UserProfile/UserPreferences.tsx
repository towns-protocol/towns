import React, { useCallback, useEffect } from 'react'
import { useMyProfile } from 'use-towns-client'
import { Box, Checkbox, Paragraph, Stack, Text } from '@ui'
import { useNotificationSettings } from 'hooks/useNotificationSettings'
import { usePatchNotificationSettings } from 'api/lib/notificationSettings'
import { Spinner } from '@components/Spinner'
import { DEFAULT_UNPACK_ENVELOPE_OPTS, useStore } from 'store/store'
import { ControlledRadioSelect } from './ControlledRadioSelect'

enum DMOptions {
    NO_ONE = 'NO_ONE',
    ONLY_IN_TOWNS = 'ONLY_IN_TOWNS',
}

enum NotificationSettingKey {
    DirectMessage = 'directMessage',
    Mention = 'mention',
    ReplyTo = 'replyTo',
}

export function UserPreferences() {
    const userId = useMyProfile()?.userId
    const { isLoadingNotificationSettings, directMessage, replyTo, mention } =
        useNotificationSettings()
    const { mutate: mutateNotificationSettings } = usePatchNotificationSettings()

    const [whoCanDM, setWhoCanDM] = React.useState<DMOptions>(DMOptions.ONLY_IN_TOWNS)
    const towns = ['San Francisco', 'New York', 'Los Angeles']

    function onWhoCanDMChange(e: React.ChangeEvent<HTMLSelectElement>) {
        setWhoCanDM(e.target.value as DMOptions)
    }

    const changeSetting = useCallback(
        (key: NotificationSettingKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!userId) {
                return
            }

            mutateNotificationSettings({
                userSettings: {
                    userId,
                    [key]: e.target.checked,
                },
            })
        },
        [mutateNotificationSettings, userId],
    )

    type CheckboxProp = {
        label: string
        checked: boolean
        key: NotificationSettingKey
    }

    const checkboxProps: CheckboxProp[] = [
        {
            label: 'Replies to my threads',
            checked: replyTo,
            key: NotificationSettingKey.ReplyTo,
        },
        {
            label: 'Mentions',
            checked: mention,
            key: NotificationSettingKey.Mention,
        },
        {
            label: 'Direct messages',
            checked: directMessage,
            key: NotificationSettingKey.DirectMessage,
        },
    ]

    if (isLoadingNotificationSettings) {
        return (
            <Box centerContent paddingTop="md">
                <Spinner />
            </Box>
        )
    }

    return (
        <>
            {/* TODO: remove this check when the who can dm endpoint is done */}
            {false && (
                <Stack padding gap background="level2" rounded="sm">
                    <Text fontWeight="strong" color="default">
                        Who can DM me
                    </Text>
                    <ControlledRadioSelect
                        value={whoCanDM}
                        label=""
                        options={[
                            { value: DMOptions.NO_ONE, label: 'No one' },
                            {
                                value: DMOptions.ONLY_IN_TOWNS,
                                label: 'Only members in these towns:',
                            },
                        ]}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onWhoCanDMChange(e)}
                    />
                    {towns.length > 0 && (
                        <Box gap paddingLeft="x4">
                            {towns.map((town) => (
                                <Checkbox labelLast key={town} name="towns" label={town} />
                            ))}
                        </Box>
                    )}
                </Stack>
            )}
            <Stack padding gap background="level2" rounded="sm">
                <Box display="flex">
                    <Text fontWeight="strong" color="default">
                        Notify me about
                    </Text>
                </Box>
                {checkboxProps.map(({ checked, key, label }) => (
                    <Checkbox
                        labelLast
                        defaultChecked
                        justifyContent="start"
                        key={key}
                        checked={checked}
                        name={key}
                        label={label}
                        onChange={changeSetting(key)}
                    />
                ))}
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
