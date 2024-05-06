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
    console.log('Uploading file', {
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
    //headers.forEach((value, key) => console.log(key, value))

    const res = await fetch(uploadFile.uploadUrl, {
        // Note PUT is important here, other verbs will not work.
        method: 'PUT',
        body: content,
        headers,
    })
    console.log('Upload response', res.status, res.statusText, await res.text())
    if (res.status) {
        return {
            filename,
            storageFilename: uploadFile.filename,
            logUrl: uploadFile.assetUrl,
        }
    } else {
        console.error('Failed to upload file', { filename: uploadFile.filename })
        return {
            filename,
            storageFilename: undefined,
            logUrl: undefined,
        }
    }
}
