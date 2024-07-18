import { useCallback } from 'react'
import { Attachment, transformAttachments, useTownsContext } from 'use-towns-client'
import { isDefined } from '@river-build/sdk'
import { SECOND_MS } from 'data/constants'
import { FileUpload, FileUploadFileContent } from './mediaDropTypes'
import { useUploadAttachment } from './useUploadAttachment'
import { useUploadStore } from './uploadStore'

export const useUploadToMessage = () => {
    const { casablancaClient } = useTownsContext()
    const { uploadAttachment } = useUploadAttachment()
    const uploadStore = useUploadStore()

    const uploadToMessage = useCallback(
        async (opts: {
            files: FileUpload<FileUploadFileContent>[]
            messageId: string
            channelId: string
            spaceId?: string
        }) => {
            const { files, messageId, channelId, spaceId = '' } = opts
            // keep track of upload status in global store
            uploadStore.setUploads({ spaceId, channelId, messageId }, [...files])

            const attachments = await Promise.all(
                files.map(async (file) => {
                    let result: Attachment | undefined
                    let retries = 0
                    while (result === undefined && retries++ <= 5) {
                        result = await uploadAttachment(
                            channelId,
                            spaceId,
                            file.content.file,
                            (progress) => {
                                uploadStore.setUploadProgress(
                                    {
                                        messageId,
                                        uploadId: file.id,
                                    },
                                    progress,
                                )
                            },
                            () => {
                                uploadStore.setUploadFailed({
                                    messageId,
                                    uploadId: file.id,
                                })
                            },
                        )
                        if (!result) {
                            await new Promise((resolve) =>
                                setTimeout(resolve, SECOND_MS * 5 * Math.pow(2, retries)),
                            )
                        }
                    }
                    return result
                }),
            )
            // find the related and update the local event before sending on wire
            const stream = casablancaClient?.streams.get(channelId)
            const event = stream?.view.events.get(messageId)
            const payload = event?.localEvent?.channelMessage.payload

            if (payload?.case === 'post' && payload.value.content?.case === 'text') {
                payload.value.content.value.attachments.push(
                    ...transformAttachments(attachments.filter(isDefined)),
                )
            } else {
                throw new Error('local event mismatch')
            }
        },
        [uploadStore, casablancaClient?.streams, uploadAttachment],
    )

    return { uploadToMessage }
}
