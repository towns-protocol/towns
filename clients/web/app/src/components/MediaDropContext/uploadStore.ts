import { create } from 'zustand'
import { FileUpload } from './mediaDropTypes'

type UploadContext = {
    spaceId: string
    channelId: string
    messageId: string
}

type UploadStoreState = {
    uploads: { [messageId: string]: { context: UploadContext; uploads: FileUpload[] } }
    setUploads: (uploadContext: UploadContext, uploads: FileUpload[]) => void
    setUploadProgress: (
        uploadContext: { messageId: string; uploadId: string },
        progress: number,
    ) => void
}

export const useUploadStore = create<UploadStoreState>((set) => ({
    uploads: {},
    setUploads: (uploadContext: UploadContext, uploads: FileUpload[]) => {
        set((state) => {
            return {
                uploads: {
                    ...state.uploads,
                    [uploadContext.messageId]: { context: uploadContext, uploads },
                },
            }
        })
    },
    setUploadProgress: (
        { messageId, uploadId }: { messageId: string; uploadId: string },
        progress: number,
    ) => {
        set((state) => {
            const messageUploads = state.uploads[messageId]
            if (!messageUploads) {
                return state
            }

            const uploads = messageUploads.uploads.map((upload) => {
                if (upload.id === uploadId) {
                    return { ...upload, progress }
                }
                return upload
            })

            // remove message upload status once all done
            if (uploads.every((upload) => upload.progress === 1)) {
                const newUploads = { ...state.uploads }
                delete newUploads[messageId]
                return { uploads: newUploads }
            }
            return {
                uploads: {
                    ...state.uploads,
                    [messageId]: {
                        context: messageUploads.context,
                        uploads,
                    },
                },
            }
        })
    },
}))
