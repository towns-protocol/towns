import React, { useCallback, useMemo, useState } from 'react'
import { SpaceData, useZionClient } from 'use-zion-client'
import { AnimatePresence } from 'framer-motion'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Box, Button, MotionText, Stack, Text, TextField } from '@ui'
import { useSetUsername } from 'hooks/useSetUsername'
import { validateUsername } from './validateUsername'

export type Props = {
    spaceData: SpaceData
}

export const SetUsernameForm = (props: Props) => {
    const { spaceData } = props
    const { getIsUsernameAvailable } = useZionClient()
    const { setUsername } = useSetUsername()
    const [requestInFlight, setRequestInFlight] = useState<boolean>(false)

    const [value, setValue] = useState<string>('')
    const [usernameAvailable, setUsernameAvailable] = useState<boolean>(true)
    const onTextFieldChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setValue(e.target.value)
            setUsernameAvailable(true)
            const usernameAvailable =
                (await getIsUsernameAvailable(spaceData.id, e.target.value)) ?? false
            setUsernameAvailable(usernameAvailable)
        },
        [setValue, setUsernameAvailable, getIsUsernameAvailable, spaceData.id],
    )

    const onSubmit = useCallback(async () => {
        setRequestInFlight(true)
        // If we succeed, we'll be redirected to the space. If not, we'll stay on this page.
        try {
            await setUsername(spaceData.id, value)
        } catch (e) {
            setRequestInFlight(false)
        }
    }, [setUsername, spaceData.id, value, setRequestInFlight])

    const usernameValid = useMemo(() => {
        return validateUsername(value)
    }, [value])

    const submitButtonEnabled = useMemo(() => {
        return usernameValid && usernameAvailable && !requestInFlight
    }, [usernameAvailable, usernameValid, requestInFlight])

    // don't show the error message as the user starts typing
    const showInvalidUsernameError = value.length > 2 && !usernameValid

    return (
        <ModalContainer onHide={() => {}}>
            <Stack gap padding>
                <Text size="md" textAlign="center" fontWeight="strong">
                    Welcome to
                </Text>
                <Text
                    size="h2"
                    textAlign="center"
                    textTransform="uppercase"
                    fontWeight="strong"
                    style={{
                        fontFamily: 'TitleFont',
                    }}
                >
                    {spaceData.name}
                </Text>

                <Text fontWeight="strong">Username</Text>
                <Text color="gray2">This is the username you will be using for this town.</Text>
                <TextField
                    autoFocus
                    disabled={requestInFlight}
                    placeholder="Enter your username"
                    background="level2"
                    value={value}
                    onChange={onTextFieldChange}
                />
                <AnimatePresence>
                    {!usernameAvailable && (
                        <MotionText
                            color="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            This username is taken in this town already. Please choose another.
                        </MotionText>
                    )}

                    {showInvalidUsernameError && (
                        <MotionText
                            color="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            Your username must be between 3 and 16 characters <br />
                            and can only contain letters, numbers, and underscores.
                        </MotionText>
                    )}
                </AnimatePresence>
                <Box paddingTop="md">
                    <Button disabled={!submitButtonEnabled} tone="cta1" onClick={onSubmit}>
                        {requestInFlight ? 'Joining Town' : 'Join Town'}
                    </Button>
                </Box>
            </Stack>
        </ModalContainer>
    )
}
