import { createIssue } from './linear-graphql/createIssue'
import { fileUpload } from './linear-graphql/fileUpload'
import { LinearConfig } from './linear-graphql/linearConfig'
import { saveLogFile } from './linear-graphql/saveLogFile'
import { Uploaded, uploadFile } from './linear-graphql/uploadLogFile'

interface CreateLinearIssueInput {
    config: LinearConfig
    env: string
    deviceInfo: string
    id: string
    name: string
    email: string
    comments: string
    logJson: string
    attachments?: File[]
    version?: string
    commitHash?: string
}

export async function createLinearIssue({
    env,
    config,
    deviceInfo,
    id,
    name,
    email,
    comments,
    logJson,
    attachments,
    version,
    commitHash,
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
        deviceInfo,
        config,
        name,
        email,
        comments,
        id,
        version,
        commitHash,
        logFilename: log.filename,
        logUrl: log.fileUrl,
        attachments: uploadedAttachments,
    })
    console.log('Linear feedback submitted')
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
