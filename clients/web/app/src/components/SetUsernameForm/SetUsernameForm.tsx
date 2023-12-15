import React, { useCallback, useMemo, useState } from 'react'
import { SpaceData, useZionClient } from 'use-zion-client'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Box, Button, Stack, Text, TextField } from '@ui'

export type Props = {
    spaceData: SpaceData
}

export const SetUsernameForm = (props: Props) => {
    const { spaceData } = props
    const { setUsername, getIsUsernameAvailable } = useZionClient()

    const [value, setValue] = useState<string>('')
    const [usernameAvailable, setUsernameAvailable] = useState<boolean>(true)
    const onTextFieldChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setValue(e.target.value)
            setUsernameAvailable(true)
            const usernameAvailable =
                (await getIsUsernameAvailable(spaceData.id.networkId, e.target.value)) ?? false
            setUsernameAvailable(usernameAvailable)
        },
        [setValue, setUsernameAvailable, getIsUsernameAvailable, spaceData.id.networkId],
    )

    const onSubmit = useCallback(async () => {
        await setUsername(spaceData.id.networkId, value).then(() => {})
    }, [setUsername, spaceData.id.networkId, value])

    const submitButtonEnabled = useMemo(() => {
        return value.length > 2 && usernameAvailable
    }, [value, usernameAvailable])

    return (
        <ModalContainer onHide={() => {}}>
            <Stack gap padding width="100%">
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
                    placeholder="Enter your username"
                    background="level2"
                    value={value}
                    onChange={onTextFieldChange}
                />
                {!usernameAvailable && (
                    <Text color="error">
                        This username is taken in this town already. Please choose another.
                    </Text>
                )}
                <Box paddingTop="md">
                    <Button disabled={!submitButtonEnabled} tone="cta1" onClick={onSubmit}>
                        Join Town
                    </Button>
                </Box>
            </Stack>
        </ModalContainer>
    )
}
