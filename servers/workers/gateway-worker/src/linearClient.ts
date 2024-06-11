import { createIssue } from './linear-graphql/createIssue'
import { fileUpload } from './linear-graphql/fileUpload'
import { LinearConfig } from './linear-graphql/linearConfig'
import { saveLogFile } from './linear-graphql/saveLogFile'
import { Uploaded, uploadFile } from './linear-graphql/uploadLogFile'

interface CreateLinearIssueInput {
    env: string
    config: LinearConfig
    id: string
    name: string
    email: string
    comments: string
    logJson: string
    attachments?: File[]
}

export async function createLinearIssue({
    env,
    config,
    id,
    name,
    email,
    comments,
    logJson,
    attachments,
}: CreateLinearIssueInput) {
    const hasAttachments = attachments && attachments.length > 0
    const uploadAttachments = attachments?.map((file) => uploadFileToLinear({ config, file })) || []

    // Upload attachments and log file
    const uploads = hasAttachments
        ? [uploadLogToLinear({ config, id, logJson }), ...uploadAttachments]
        : [uploadLogToLinear({ config, id, logJson })]
    const [log, ...uploadedAttachments] = await Promise.all(uploads)

    // Create issue
    await createIssue({
        env,
        config,
        name,
        email,
        comments,
        id,
        logFilename: log.filename,
        logUrl: log.fileUrl,
        attachments: uploadedAttachments,
    })
}

interface UploadLogToLinearInput {
    config: LinearConfig
    id: string
    logJson: string
}

interface UploadFileToLinearInput {
    config: LinearConfig
    file: File
}

async function uploadFileToLinear({ config, file }: UploadFileToLinearInput): Promise<Uploaded> {
    const { success, error, response, httpStatusCode } = await fileUpload({
        config,
        payload: { filename: file.name, contentType: file.type, size: file.size },
    })
    // failed to get the upload url
    if (!success) {
        console.error('[uploadFileToLinear] Failed to get upload url:', {
            filename: file.name,
            httpStatusCode,
            error,
        })
        return {
            filename: file.name,
            fileUrl: undefined,
            storageFilename: undefined,
            contentType: undefined,
        }
    }

    // got the upload url. now upload the file
    return uploadFile({
        filename: file.name,
        uploadFile: response,
        content: file,
    })
}

async function uploadLogToLinear({
    config,
    id,
    logJson,
}: UploadLogToLinearInput): Promise<Uploaded> {
    const logFile = saveLogFile({ id, logJson })

    return uploadFileToLinear({ config, file: logFile })
}
