import { createIssue } from './linear-graphql/createIssue'
import { fileUpload } from './linear-graphql/fileUpload'
import { LinearConfig } from './linear-graphql/linearConfig'
import { saveLogFile } from './linear-graphql/saveLogFile'
import { Uploaded, uploadLogFile } from './linear-graphql/uploadLogFile'

interface CreateLinearIssueInput {
    config: LinearConfig
    id: string
    name: string
    email: string
    comments: string
    logJson: string
}

export async function createLinearIssue({
    config,
    id,
    name,
    email,
    comments,
    logJson,
}: CreateLinearIssueInput) {
    // Upload logs
    const { filename: logFilename, logUrl } = await uploadFileToLinear({ config, id, logJson })

    // Create issue
    await createIssue({
        config,
        name,
        email,
        comments,
        id,
        logFilename,
        logUrl,
    })
}

interface UploadFileToLinearInput {
    config: LinearConfig
    id: string
    logJson: string
}

async function uploadFileToLinear({
    config,
    id,
    logJson,
}: UploadFileToLinearInput): Promise<Uploaded> {
    const { filename, contentType, size, content } = saveLogFile({ id, logJson })
    const { success, uploadFile, error, httpStatusCode } = await fileUpload({
        config,
        payload: { filename, contentType, size },
    })
    // failed to get the upload url
    if (!success) {
        console.error('[uploadFileToLinear] Failed to get upload url:', {
            filename,
            httpStatusCode,
            error,
        })
        return {
            filename,
            logUrl: undefined,
            storageFilename: undefined,
        }
    }

    // got the upload url. now upload the file
    return uploadLogFile({
        filename,
        uploadFile: uploadFile,
        content,
    })
}
