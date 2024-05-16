interface SaveLogFileInput {
    id: string
    logJson: string
}

export function saveLogFile({ id, logJson }: SaveLogFileInput): File {
    const filename = `logs-${id}.json`
    const blob = new Blob([logJson], {
        type: 'application/json;charset=UTF-8',
    })
    const file = new File([blob], filename, { type: 'text/json;charset=utf-8' })
    return file
}
