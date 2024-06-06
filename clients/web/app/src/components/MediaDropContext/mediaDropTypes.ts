import { Attachment } from 'use-towns-client'

export type FileUploadFileContent = {
    kind: 'file'
    file: File
}

export type FileUploadAttachmentContent = {
    kind: 'attachment'
    attachment: Attachment
}

type AttachmentContent = FileUploadFileContent | FileUploadAttachmentContent

export type FileUpload<T extends AttachmentContent = AttachmentContent> = {
    id: string
    content: T
    progress: number
}
