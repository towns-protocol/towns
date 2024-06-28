import React, { useCallback, useMemo, useState } from 'react'
import { useChannelId } from 'use-towns-client'
import { Panel } from '@components/Panel/Panel'
import { Button, Stack, Text } from '@ui'
import { ButtonSpinner } from 'ui/components/Spinner/ButtonSpinner'
import { useMintBot } from 'hooks/useMintBot'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { EditableInputField } from '@components/SetUsernameDisplayName/EditableInputField'
import { useValidateUsername } from 'hooks/useValidateUsername'
import { validateDisplayName, validateUsername } from '@components/SetUsernameForm/validateUsername'

export const MintBotPanel = ({ streamId }: { streamId: string }) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [displayName, setDisplayName] = React.useState<string>('')
    const { username, usernameErrorMessage, updateUsername } = useValidateUsername({ streamId })
    const mintBot = useMintBot()

    const onUsernameChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            updateUsername(e.target.value)
        },
        [updateUsername],
    )

    const onDisplayNameChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setDisplayName(e.target.value)
        },
        [setDisplayName],
    )

    const displayNameErrorMessage = useMemo(
        () => validateDisplayName(displayName).message,
        [displayName],
    )

    const onMintBot = async () => {
        if (usernameErrorMessage || displayNameErrorMessage || !username) {
            return
        }

        setLoading(true)
        await mintBot(username, displayName)
        setLoading(false)

        setDisplayName('')
        updateUsername('')
    }

    const isBtnDisabled = useMemo(() => {
        return !username || !validateUsername(username) || !validateDisplayName(displayName).valid
    }, [displayName, username])

    return (
        <Panel label="Mint Bot">
            {loading ? (
                <Stack centerContent padding gap="md">
                    <Text>Minting bot</Text>
                    <ButtonSpinner />
                </Stack>
            ) : (
                <>
                    <Stack gap paddingTop="xs">
                        <EditableInputField
                            title="Display name"
                            value={displayName}
                            error={displayNameErrorMessage}
                            placeholder="Enter display name"
                            maxLength={32}
                            onChange={onDisplayNameChange}
                        />

                        <EditableInputField
                            title="Username"
                            value={username}
                            error={usernameErrorMessage}
                            maxLength={16}
                            placeholder="Enter username"
                            onChange={onUsernameChange}
                        />
                    </Stack>
                    <Button disabled={isBtnDisabled} onClick={onMintBot}>
                        Mint Bot
                    </Button>
                </>
            )}
        </Panel>
    )
}

export const MintBotPrivyWrapper = () => {
    const streamId = useChannelId()
    return (
        <PrivyWrapper>
            <MintBotPanel streamId={streamId} />
        </PrivyWrapper>
    )
}
