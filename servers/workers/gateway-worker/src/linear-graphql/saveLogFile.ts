interface SaveLogFileInput {
    id: string
    logJson: string
}

interface SaveLogFileOutput {
    filename: string
    contentType: string
    size: number
    content: File | Buffer
}

export function saveLogFile({ id, logJson }: SaveLogFileInput): SaveLogFileOutput {
    const filename = `logs-${id}.json`
    const blob = new Blob([logJson], {
        type: 'application/json;charset=UTF-8',
    })
    const blobFile = new File([blob], filename, { type: 'text/json;charset=utf-8' })
    return {
        filename,
        contentType: 'application/json',
        size: blobFile.size,
        content: blobFile,
    }
}
