import { UploadFile } from './fileUpload'

export interface Upload {
    filename: string
    uploadFile: UploadFile
    content: File | Buffer
}

export interface Uploaded {
    filename: string
    storageFilename: string | undefined
    logUrl: string | undefined
}

export async function uploadLogFile({ filename, uploadFile, content }: Upload): Promise<Uploaded> {
    console.log('[uploadLogFile] Uploading file', {
        filename,
        assetUrl: uploadFile.assetUrl,
        uploadUrl: uploadFile.uploadUrl,
        storageFilename: uploadFile.filename,
    })
    // Make sure to copy the response headers for the PUT request
    const headers = new Headers()
    // It is important that the content-type of the request matches the value passed as the first argument to `fileUpload`.
    headers.set('Content-Type', uploadFile.contentType)
    uploadFile.headers.forEach(({ key, value }) => {
        headers.set(key, value)
    })
    console.log('[uploadLogFile] --- BEGIN headers ---')
    headers.forEach((value, key) => console.log(key, value))
    console.log('[uploadLogFile] --- END headers ---')

    const res = await fetch(uploadFile.uploadUrl, {
        // Note PUT is important here, other verbs will not work.
        method: 'PUT',
        body: content,
        headers,
    })
    console.log('[uploadLogFile] Upload response', res.status, res.statusText, await res.text())
    if (res.status === 200) {
        return {
            filename,
            storageFilename: uploadFile.filename,
            logUrl: uploadFile.assetUrl,
        }
    } else {
        console.error('[uploadLogFile] Failed to upload file', {
            filename,
            contentType: uploadFile.contentType,
            headers: uploadFile.headers.map(({ key, value }) => `${key}: ${value}`).join('\n'),
            uploadFilename: uploadFile.filename,
            uploadUrl: uploadFile.uploadUrl,
        })
        return {
            filename,
            storageFilename: undefined,
            logUrl: undefined,
        }
    }
}
