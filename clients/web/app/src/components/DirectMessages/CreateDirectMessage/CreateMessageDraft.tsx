import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getDraftDMStorageId } from 'utils'
import { useDevice } from 'hooks/useDevice'
import { useCreateDirectMessage } from './hooks/useCreateDirectMessage'
import { MessageContainerLayout } from './CreateMessageSelect'

const DEBUG_PREVENT_SUBMIT = import.meta.env.DEV && false

export const DraftDirectMessage = (props: { userIdsFromParams: string[] }) => {
    const { isTouch } = useDevice()
    const { userIdsFromParams } = props
    const [selectedUsers] = useState(() => new Set<string>(userIdsFromParams))
    const selectedUserArray = useMemo(() => Array.from(selectedUsers), [selectedUsers])

    const onDirectMessageCreated = useCallback((streamId: string) => {
        setCreatedStreamId(streamId)
        history.replaceState({}, '', `/messages/${streamId}`)
    }, [])

    const { onSubmit } = useCreateDirectMessage({
        userIds: selectedUserArray,
        onStreamCreated: onDirectMessageCreated,
    })

    const [createdStreamId, setCreatedStreamId] = useState<string | undefined>()

    const onSubmitRef = useRef(onSubmit)
    onSubmitRef.current = onSubmit

    useEffect(() => {
        if (userIdsFromParams?.length) {
            console.log('create dm: submit from params')
            if (!DEBUG_PREVENT_SUBMIT) {
                onSubmitRef.current()
            }
        }
    }, [userIdsFromParams?.length])

    const storageId = getDraftDMStorageId(selectedUserArray)

    return (
        <MessageContainerLayout
            hideHeader={isTouch}
            streamId={createdStreamId}
            userIds={selectedUserArray}
            storageId={storageId}
        />
    )
}
