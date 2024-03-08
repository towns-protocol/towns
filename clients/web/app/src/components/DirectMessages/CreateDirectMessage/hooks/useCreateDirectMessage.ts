import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import { DMChannelIdentifier, useTownsClient } from 'use-towns-client'
import { useErrorToast } from 'hooks/useErrorToast'
import { useCreateLink } from 'hooks/useCreateLink'

type Params = {
    selectedIdsArray: string[]
    matchingChannel: DMChannelIdentifier | undefined
    onDirectMessageCreated?: () => void
}

export const useCreateDirectMessage = (params: Params) => {
    const { selectedIdsArray, matchingChannel, onDirectMessageCreated } = params

    const [isSubmitting, setIsSubmitting] = useState(false)
    const isSubmittingRef = useRef(isSubmitting)
    isSubmittingRef.current = isSubmitting

    const { createDMChannel, createGDMChannel } = useTownsClient()
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
    const { createLink } = useCreateLink()
    const navigate = useNavigate()

    const [search] = useSearchParams()

    useErrorToast({
        errorMessage,
        contextMessage: 'There was an error creating the message',
    })

    const linkRef = useMemo(() => {
        const ref = search.get('ref')
        return ref ? `?ref=${ref}` : ''
    }, [search])

    const onSubmit = useCallback(async () => {
        const userIds = Array.from(new Set(selectedIdsArray))
        console.log('create dm/gm: submit', userIds.join())
        if (isSubmittingRef.current) {
            console.warn('create dm/gm: submit - already submitting')
            return
        }
        if (userIds.length === 1 && matchingChannel) {
            console.log('create dm/gm: existingChannel', matchingChannel)
            const link = createLink({ messageId: matchingChannel.id })
            if (link) {
                onDirectMessageCreated?.()
                navigate(link + linkRef)
            }
            return
        }

        const numSelected = selectedIdsArray.length

        if (numSelected === 0) {
            console.warn('create dm: submit - no users selected')
        } else if (numSelected === 1) {
            const first = selectedIdsArray[0]
            console.log('create dm: submit', first)
            setIsSubmitting(true)
            const streamId = await createDMChannel(first)
            if (streamId) {
                console.log('create dm: created stream', streamId)
                const link = createLink({ messageId: streamId })
                if (link) {
                    console.log('create dm: navigating', link)
                    onDirectMessageCreated?.()
                    navigate(link + linkRef)
                }
            } else {
                console.error('create dm: failed creating stream')
                setErrorMessage('failed to create dm stream')
            }
            setIsSubmitting(false)
        } else {
            console.log('create gm: submit', selectedIdsArray.join())
            setIsSubmitting(true)
            const streamId = await createGDMChannel(selectedIdsArray)
            if (streamId) {
                console.log('create gm: created stream', streamId)
                const link = createLink({ messageId: streamId })
                if (link) {
                    console.log('create gm: navigating', link)
                    onDirectMessageCreated?.()
                    navigate(link)
                }
            } else {
                setErrorMessage('failed to create gm stream')
            }
            setIsSubmitting(false)
        }
    }, [
        createDMChannel,
        createGDMChannel,
        createLink,
        matchingChannel,
        linkRef,
        navigate,
        onDirectMessageCreated,
        selectedIdsArray,
    ])
    return { onSubmit, isSubmitting }
}
