import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import { useTownsClient, useTownsContext } from 'use-towns-client'
import { useErrorToast } from 'hooks/useErrorToast'
import { useCreateLink } from 'hooks/useCreateLink'
import { useNotificationSettings } from 'hooks/useNotificationSettings'
import { useMatchingMessages } from './useMatchingMessages'

type Params = {
    userIds: string[]
    onStreamCreated?: (streamId: string) => void
}
const PREVENT_SUBMIT = false

export const useCreateDirectMessage = (params: Params) => {
    const { onStreamCreated } = params

    const userIds = useMemo(() => Array.from(new Set(params.userIds)), [params.userIds])

    const [isSubmitting, setIsSubmitting] = useState(false)
    const isSubmittingRef = useRef(isSubmitting)
    isSubmittingRef.current = isSubmitting

    const { createDMChannel, createGDMChannel } = useTownsClient()
    const { dmChannels } = useTownsContext()
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
    const { createLink } = useCreateLink()
    const navigate = useNavigate()

    const [search] = useSearchParams()
    const { addDmGdmNotificationSettings } = useNotificationSettings()

    const { matchingDM } = useMatchingMessages({
        selectedUserArray: userIds,
        dmChannels,
    })

    useErrorToast({
        errorMessage,
        contextMessage: 'There was an error creating the message',
    })

    const linkRef = useMemo(() => {
        const ref = search.get('ref')
        return ref ? `?ref=${ref}` : ''
    }, [search])

    const onSubmit = useCallback(async () => {
        console.log('create dm/gm: submit', userIds.join())

        if (isSubmittingRef.current) {
            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            //                                                    Pending submit

            console.warn('create dm/gm: submit - already submitting')
            return
        }

        if (userIds.length === 1 && matchingDM) {
            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            //                                                       Existing DM
            console.log('create dm/gm: existingChannel', matchingDM)
            const link = createLink({ messageId: matchingDM.id })
            if (link) {
                console.log('add dm notification settings', matchingDM.id)
                void addDmGdmNotificationSettings(matchingDM.id)
                if (onStreamCreated) {
                    onStreamCreated?.(matchingDM.id)
                } else {
                    navigate(link + linkRef)
                }
            }
            return
        }

        const numSelected = userIds.length

        if (numSelected === 0) {
            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            //                                                      No selection

            console.warn('create dm: submit - no users selected')
        } else if (numSelected === 1) {
            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            //                                                  DM - single user

            const first = userIds[0]

            console.log('create dm: submit', first)
            setIsSubmitting(true)
            const streamId = await createDMChannel(first)

            if (!streamId) {
                console.error('create dm: failed creating stream')
                setErrorMessage('failed to create dm stream')
                setIsSubmitting(false)
                return
            }

            console.log('create dm: created stream', streamId)

            console.log('add dm notification settings', streamId)
            void addDmGdmNotificationSettings(streamId)

            if (onStreamCreated) {
                console.log('create dm: apply stream to draft', streamId)
                onStreamCreated?.(streamId)
            } else {
                const link = createLink({ messageId: streamId })
                console.log('create dm: navigating', link)
                if (link) {
                    navigate(link + linkRef)
                }
            }
            setIsSubmitting(false)
        } else {
            // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
            //                                              GDM - multiple users

            console.log('create gm: submit', userIds.join())
            setIsSubmitting(true)

            const streamId = await createGDMChannel(userIds)

            if (!streamId) {
                setErrorMessage('failed to create gm stream')
                setIsSubmitting(false)
                return
            }
            console.log('create gm: created stream', streamId)
            const link = createLink({ messageId: streamId })

            if (link) {
                console.log('add gdm notification settings', streamId)
                void addDmGdmNotificationSettings(streamId)

                if (onStreamCreated) {
                    console.log('create gm: apply stream to draft', streamId)
                    onStreamCreated?.(streamId)
                } else {
                    console.log('create gm: navigating', link)
                    navigate(link)
                }
            }

            setIsSubmitting(false)
        }
    }, [
        userIds,
        matchingDM,
        createLink,
        addDmGdmNotificationSettings,
        onStreamCreated,
        navigate,
        linkRef,
        createDMChannel,
        createGDMChannel,
    ])

    const preventSubmit = useCallback(() => {
        setIsSubmitting(true)
        console.warn('create dm/gm: prevent submit')
    }, [])

    return { onSubmit: PREVENT_SUBMIT ? preventSubmit : onSubmit, isSubmitting }
}
