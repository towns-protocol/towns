import { LinearConfig } from './linearConfig'

export type Header = Record<string, string>

export interface UploadFileResponse {
    assetUrl: string
    uploadUrl: string
    filename: string
    contentType: string
    headers: Header[]
}

interface FileUploadInput {
    config: LinearConfig
    payload: UploadPayload
}

interface FileUploadOutput {
    response: UploadFileResponse
    success: boolean
    httpStatusCode?: number
    error?: unknown
}

interface UploadPayload {
    filename: string
    contentType: string
    size: number
}

export async function fileUpload({ config, payload }: FileUploadInput): Promise<FileUploadOutput> {
    const mutation = `
mutation FileUpload($filename: String!, $size: Int!, $contentType: String!) {
fileUpload(filename: $filename, size: $size, contentType: $contentType) {
  success
  uploadFile {
    assetUrl
    size
    uploadUrl
    headers {
      key
      value
    }
    filename
    contentType
  }
}
}`
    const { filename, contentType, size } = payload
    const variables = {
        filename,
        size,
        contentType,
    }

    const graphql = JSON.stringify({
        query: mutation,
        variables,
    })

    const res = await fetch(config.graphQLUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `${config.apiKey}`,
        },
        body: graphql,
    })
    // failed to get the upload url
    if (res.status !== 200) {
        const body = await res.text()
        let headers = ''
        // rate limited errors are stored in the response headers
        // see what's returned in the headers
        if (res.status === 429) {
            res.headers.forEach((value, key) => {
                headers += `${key}: ${value}\n`
            })
        }
        console.error('[fileUpload] Failed to get upload url:', {
            status: res.status,
            body,
            rateLimitedErrors: headers,
        })
        return {
            response: {
                assetUrl: '',
                uploadUrl: '',
                filename: '',
                contentType: '',
                headers: [],
            },
            success: false,
            httpStatusCode: res.status,
            error: body,
        }
    }
    // extract the upload url
    const fileUploadOutput = (await res.json()) as {
        data: {
            fileUpload: {
                uploadFile: UploadFileResponse
            }
        }
    }
    const uploadFile = fileUploadOutput.data.fileUpload.uploadFile
    return {
        response: uploadFile,
        success: true,
    }
}
