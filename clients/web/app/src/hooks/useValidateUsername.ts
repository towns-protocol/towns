import React, { useCallback, useMemo, useState } from 'react'
import { useTownsClient } from 'use-towns-client'
import { validateDisplayName, validateUsername } from '@components/SetUsernameForm/validateUsername'

export const useValidateUsername = ({
    streamId,
    defaultUsername,
}: {
    streamId: string
    defaultUsername?: string
}) => {
    const [username, setUsername] = useState<string>(defaultUsername ?? '')
    const [usernameAvailable, setUsernameAvailable] = React.useState<boolean>(true)
    const { getIsUsernameAvailable } = useTownsClient()

    const updateUsername = useCallback(
        async (value: string) => {
            if (!streamId) {
                return
            }

            setUsername(value)
            setUsernameAvailable(true)
            const usernameAvailable = (await getIsUsernameAvailable(streamId, value)) ?? false
            setUsernameAvailable(usernameAvailable)
        },
        [getIsUsernameAvailable, streamId],
    )

    const usernameErrorMessage = useMemo(() => {
        if (username.length < 3) {
            return undefined
        }
        if (!usernameAvailable) {
            return 'This username is already taken.'
        }

        if (validateUsername(username)) {
            return undefined
        }
        return 'Your username must be between 1 and 16 characters and can only contain letters, numbers, and underscores.'
    }, [username, usernameAvailable])

    return {
        username,
        updateUsername,
        usernameErrorMessage,
    }
}

export const useValidateDisplayName = (defaultDisplayname?: string) => {
    const [displayName, setDisplayName] = useState<string>(defaultDisplayname ?? '')

    const displayNameErrorMessage = useMemo(
        () => validateDisplayName(displayName).message,
        [displayName],
    )

    return {
        displayName,
        updateDisplayName: setDisplayName,
        displayNameErrorMessage,
    }
}
