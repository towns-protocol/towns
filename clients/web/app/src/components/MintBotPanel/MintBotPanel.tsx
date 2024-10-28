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
import { useErrorToast } from 'hooks/useErrorToast'
import { GetSigner, WalletReady } from 'privy/WalletReady'

export const MintBotPanel = ({ streamId }: { streamId: string }) => {
    const [loading, setLoading] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string>('')
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

    const onMintBot = async (getSigner: GetSigner) => {
        setErrorMessage('')
        if (usernameErrorMessage || displayNameErrorMessage || !username) {
            return
        }

        setLoading(true)
        try {
            await mintBot(getSigner, username, displayName)
            setDisplayName('')
            updateUsername('')
        } catch (e) {
            setErrorMessage('Failed to mint bot')
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const isBtnDisabled = useMemo(() => {
        return !username || !validateUsername(username) || !validateDisplayName(displayName).valid
    }, [displayName, username])

    useErrorToast({
        errorMessage,
    })

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
                    <WalletReady>
                        {({ getSigner }) => (
                            <Button disabled={isBtnDisabled} onClick={() => onMintBot(getSigner)}>
                                Mint Bot
                            </Button>
                        )}
                    </WalletReady>
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
