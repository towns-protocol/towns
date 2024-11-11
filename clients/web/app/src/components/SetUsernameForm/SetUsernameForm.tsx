import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SpaceData, useMyDefaultUsernames, useTownsClient } from 'use-towns-client'
import { AnimatePresence } from 'framer-motion'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Box, FancyButton, MotionText, Stack, Text, TextField } from '@ui'
import { useSetUsername } from 'hooks/useSetUsername'
import { SECOND_MS } from 'data/constants'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'
import { validateUsername } from './validateUsername'

export type Props = {
    spaceData: SpaceData
}

export const SetUsernameFormWithClose = (props: Props) => {
    const [showModal, setShowModal] = useState<boolean>(true)
    const hide = () => setShowModal(false)
    return showModal && <SetUsernameForm onHide={hide} {...props} />
}

export const SetUsernameForm = (props: Props & { onHide: () => void }) => {
    const { spaceData } = props
    const defaultUsername = useMyDefaultUsernames()?.[0]
    const { getIsUsernameAvailable } = useTownsClient()
    const { setUsername } = useSetUsername()
    const isModified = useRef<boolean>(false)
    const [requestInFlight, setRequestInFlight] = useState<boolean>(false)
    const { setUsernameWhenJoiningTown } = useJoinFunnelAnalytics()

    const [ready, setReady] = useState<boolean>(false)
    const [value, setValue] = useState<string>('')
    const [usernameAvailable, setUsernameAvailable] = useState<boolean>(true)

    const onTextFieldChange = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            isModified.current = true
            setValue(e.target.value)
            setUsernameAvailable(true)
            const _usernameAvailable =
                (await getIsUsernameAvailable(spaceData.id, e.target.value)) ?? false
            setUsernameAvailable(_usernameAvailable)
        },
        [setValue, setUsernameAvailable, getIsUsernameAvailable, spaceData.id],
    )

    const onSubmit = useCallback(
        (e: FormEvent<HTMLFormElement>) => {
            e.preventDefault()

            setRequestInFlight(true)
            const submit = async () => {
                // If we succeed, we'll be redirected to the space. If not, we'll stay on this page.
                try {
                    await setUsername(spaceData.id, value)
                    setUsernameWhenJoiningTown({ spaceId: spaceData.id })
                } catch (e) {
                    setRequestInFlight(false)
                }
            }
            void submit()
            props.onHide()
        },
        [props, setUsername, spaceData.id, value, setUsernameWhenJoiningTown],
    )

    const usernameValid = useMemo(() => {
        return validateUsername(value)
    }, [value])

    const submitButtonEnabled = useMemo(() => {
        return usernameValid && usernameAvailable && !requestInFlight
    }, [usernameAvailable, usernameValid, requestInFlight])

    // don't show the error message as the user starts typing
    const showInvalidUsernameError = value.length > 2 && !usernameValid

    useEffect(() => {
        const checkDefaultUsername = async () => {
            console.log('[SetUsernameForm] checking defaultUsername')
            // note: if the username is being set via join flow, it may appear as taken
            const available = await getIsUsernameAvailable(spaceData.id, defaultUsername)

            console.log(`[SetUsernameForm] a defaultUsername is available... ${available}`)
            setValue(defaultUsername)
            setUsernameAvailable(!!available)
            setReady(true)

            console.log('[SetUsernameForm] no defaultUsername available', defaultUsername)
        }

        if (defaultUsername) {
            // A default username is set and may be in the process of being
            // applied in parallel via the join flow.
            // Check if it's available to potentially use as the default value
            // This serves as a fallback if the default username setting times out
            checkDefaultUsername()
        } else {
            console.info('[SetUsernameForm] scenario 2: no defaultUsername or adjacent space')
            setReady(true)
        }
    }, [defaultUsername, getIsUsernameAvailable, spaceData.id])

    const hasDefaultUsername = !!defaultUsername

    useEffect(() => {
        if (hasDefaultUsername) {
            console.info('[SetUsernameForm] grace period for setting defaultUsername')
            const timeout = setTimeout(() => {
                console.info('[SetUsernameForm] grace period timeout')
                setReady(true)
            }, SECOND_MS * 10)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [hasDefaultUsername])

    const noop = useCallback(() => {
        // no-op
    }, [])

    if (!ready) {
        return null
    }

    return (
        <ModalContainer onHide={noop}>
            <Stack padding gap="x4">
                <Stack gap>
                    <Text size="md" textAlign="center" fontWeight="strong">
                        Welcome to
                    </Text>
                    <Text size="h2" textAlign="center" fontWeight="strong">
                        {spaceData.name}
                    </Text>
                </Stack>
                <Stack gap>
                    <Text fontWeight="strong">Username</Text>
                    <Text color="gray2">This is the username you will be using for this town.</Text>
                    <form autoComplete="off" onSubmit={onSubmit}>
                        <TextField
                            autoFocus
                            name="username"
                            disabled={requestInFlight}
                            placeholder="Enter your username"
                            background="level2"
                            value={value}
                            autoComplete="off"
                            data-testid="town-username-input"
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
                                    This username is taken in this town already. Please choose
                                    another.
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
                            <FancyButton
                                cta
                                type="submit"
                                disabled={!submitButtonEnabled}
                                data-testid="submit-username-button"
                            >
                                {requestInFlight ? 'Joining Town' : 'Join Town'}
                            </FancyButton>
                        </Box>
                    </form>
                </Stack>
            </Stack>
        </ModalContainer>
    )
}
