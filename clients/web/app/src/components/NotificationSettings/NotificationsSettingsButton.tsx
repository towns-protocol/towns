import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNotificationSettings } from 'use-towns-client'
import {
    DmChannelSettingValue,
    GdmChannelSettingValue,
    SpaceChannelSettingValue,
} from '@towns-protocol/proto'
import { spaceIdFromChannelId } from '@towns-protocol/sdk'
import { Box, Icon, Paragraph, PopupMenu, Stack } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import {
    channelNotificationSettings,
    dmNotificationSettings,
    gdmNotificationSettings,
    resetToDmDefault,
    resetToGdmDefault,
    resetToSpaceDefault,
} from './NotificationsConstants'

type Props =
    | {
          type: 'space'
          spaceId: string
      }
    | {
          type: 'channel'
          spaceId?: string
          channelId: string
      }
    | {
          type: 'gdm'
          channelId: string
      }
    | {
          type: 'gdmGlobal'
      }
    | {
          type: 'dm'
          channelId: string
      }
    | {
          type: 'dmGlobal'
      }

function makeSettingsOptions<K, T extends { value: K }>(
    options: T[],
    currentValue: K,
    setSetting: (newValue: K) => void,
) {
    let index = options.findIndex((option) => option.value === currentValue)
    if (index === -1) {
        console.error('NotificationSettingsButton: Invalid index', { options, currentValue, index })
        index = 0
    }
    return {
        options: options,
        index: options.findIndex((option) => option.value === currentValue),
        setSettingFn: (index: number) => {
            const newOption = options[index]
            return setSetting(newOption.value)
        },
    }
}

export function TownNotificationsButton(props: Props) {
    const {
        isLoading,
        error,
        notificationSettingsClient,
        getSpaceSetting,
        getChannelSetting,
        getRawChannelSetting,
        getDmSetting,
        getRawDmSetting,
        getGdmSetting,
        getRawGdmSetting,
        getGdmGlobalSetting,
        getDmGlobalSetting,
    } = useNotificationSettings()

    const { options, index, setSettingFn } = useMemo(() => {
        switch (props.type) {
            case 'space': {
                return makeSettingsOptions(
                    channelNotificationSettings,
                    getSpaceSetting(props.spaceId),
                    (value) => notificationSettingsClient?.setSpaceSetting(props.spaceId, value),
                )
            }
            case 'channel': {
                const rawValue = getRawChannelSetting(props.channelId)
                let settings = channelNotificationSettings
                if (rawValue !== SpaceChannelSettingValue.SPACE_CHANNEL_SETTING_UNSPECIFIED) {
                    const spaceId = spaceIdFromChannelId(props.channelId)
                    const spaceValue = getSpaceSetting(spaceId)
                    settings = [...channelNotificationSettings, resetToSpaceDefault(spaceValue)]
                }
                return makeSettingsOptions(settings, getChannelSetting(props.channelId), (value) =>
                    notificationSettingsClient?.setChannelSetting(props.channelId, value),
                )
            }
            case 'gdm': {
                const rawValue = getRawGdmSetting(props.channelId)
                let settings = gdmNotificationSettings
                if (rawValue !== GdmChannelSettingValue.GDM_UNSPECIFIED) {
                    const gdmGlobal = getGdmGlobalSetting()
                    settings = [...gdmNotificationSettings, resetToGdmDefault(gdmGlobal)]
                }
                return makeSettingsOptions(settings, getGdmSetting(props.channelId), (value) =>
                    notificationSettingsClient?.setGdmChannelSetting(props.channelId, value),
                )
            }
            case 'dm': {
                const rawValue = getRawDmSetting(props.channelId)
                let settings = dmNotificationSettings
                if (rawValue !== DmChannelSettingValue.DM_UNSPECIFIED) {
                    const dmGlobal = getDmGlobalSetting()
                    settings = [...dmNotificationSettings, resetToDmDefault(dmGlobal)]
                }
                return makeSettingsOptions(settings, getDmSetting(props.channelId), (value) =>
                    notificationSettingsClient?.setDmChannelSetting(props.channelId, value),
                )
            }
            case 'gdmGlobal': {
                return makeSettingsOptions(
                    gdmNotificationSettings,
                    getGdmGlobalSetting(),
                    (value) => notificationSettingsClient?.setGdmGlobalSetting(value),
                )
            }
            case 'dmGlobal': {
                return makeSettingsOptions(dmNotificationSettings, getDmGlobalSetting(), (value) =>
                    notificationSettingsClient?.setDmGlobalSetting(value),
                )
            }
        }
    }, [
        getChannelSetting,
        getDmGlobalSetting,
        getDmSetting,
        getGdmGlobalSetting,
        getGdmSetting,
        getRawChannelSetting,
        getRawDmSetting,
        getRawGdmSetting,
        getSpaceSetting,
        notificationSettingsClient,
        props,
    ])

    const [value, setValue] = useState<(typeof options)[number]>(options[index])

    useEffect(() => {
        // use effect here to update the state for the first load
        // of the latest notification settings ( user launches towns.com, initial settings
        // load from local storage, we make a request for the latest settings and update the state
        setValue(options[index])
    }, [options, index])

    const onChange = useCallback(
        (option: (typeof options)[number]) => {
            setValue(option)
            const index = options.findIndex((o) => o.value === option.value)
            if (index === -1) {
                console.error('NotificationSettingsButton: Invalid index on press', {
                    options,
                    option,
                    index,
                })
                return
            }
            setSettingFn(index)
        },
        [options, setSettingFn],
    )

    if (error) {
        return (
            <Stack
                horizontal
                padding
                data-testid="notifications-settings-button"
                gap="sm"
                alignItems="center"
                title={formatError(error)}
                background="level2"
                rounded="sm"
            >
                <Icon type="notificationsOn" size="square_sm" color="gray2" />
                <Paragraph color="error">Error loading settings</Paragraph>
            </Stack>
        )
    } else if (isLoading) {
        return (
            <Stack
                padding
                horizontal
                data-testid="notifications-settings-button"
                gap="sm"
                alignItems="center"
                background="level2"
                rounded="sm"
            >
                <Icon type="notificationsOn" size="square_sm" color="gray2" />
                <ButtonSpinner />
            </Stack>
        )
    } else {
        return (
            <PopupMenu
                options={options}
                value={value}
                getKey={(option) => option.title}
                data-testid="notifications-settings-button"
                renderButton={(option) => (
                    <Stack horizontal gap="sm" alignItems="center">
                        <Icon type={option.icon} size="square_sm" color="gray2" />
                        <Paragraph color="default">{option.title}</Paragraph>
                    </Stack>
                )}
                renderMenu={(option, isSelected) => (
                    <Stack horizontal gap="sm">
                        {option?.icon && (
                            <Box
                                centerContent
                                width={{ desktop: 'x4', mobile: 'x3' }}
                                height={{ desktop: 'x4', mobile: 'x3' }}
                                rounded="xs"
                                background="level3"
                                shrink={false}
                            >
                                <Icon type={option?.icon} size="square_sm" color="gray2" />
                            </Box>
                        )}
                        <Stack grow gap="sm" shrink={false} justifyContent="center">
                            <Paragraph color="default" size={{ desktop: 'md', mobile: 'sm' }}>
                                {option?.title}
                            </Paragraph>
                            <Paragraph
                                color="gray2"
                                size={{ desktop: 'sm', mobile: 'xs' }}
                                whiteSpace={{ desktop: 'nowrap', mobile: 'normal' }}
                            >
                                {option?.description}
                            </Paragraph>
                        </Stack>
                        <Stack centerContent width={{ default: 'x3', mobile: 'x1' }} shrink={false}>
                            {isSelected && (
                                <Icon
                                    type="check"
                                    size={{ desktop: 'square_sm', mobile: 'square_xs' }}
                                    color="default"
                                />
                            )}
                        </Stack>
                    </Stack>
                )}
                onChange={onChange}
            />
        )
    }
}

function formatError(error: Error) {
    const jsonStr = JSON.stringify(error, undefined, 2)
    if (jsonStr === '{}' || jsonStr === '') {
        return `Error: ${error.message}`
    }
    return jsonStr
}
