import React, { useCallback, useMemo, useState } from 'react'
import { Box, Icon, Paragraph, PopupMenu, Stack } from '@ui'
import {
    channelNotificationSettings,
    dmNotificationSettings,
    gdmNotificationSettings,
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
          type: 'dm'
          channelId: string
      }

export function TownNotificationsButton(props: Props) {
    const { type } = props

    const options = useMemo(() => {
        switch (type) {
            case 'space': {
                return channelNotificationSettings
            }
            case 'channel': {
                return channelNotificationSettings
            }
            case 'gdm': {
                return gdmNotificationSettings
            }
            case 'dm': {
                return dmNotificationSettings
            }
        }
    }, [type])

    const [value, setValue] = useState<(typeof options)[number]>(options[0])

    const onChange = useCallback((option: (typeof options)[number]) => {
        setValue(option)
    }, [])

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
