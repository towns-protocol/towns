export const getLinearPayloadFromFormData = (formData: FormData) => {
    const version = formData.get('version')
    const commitHash = formData.get('commithash')
    return {
        env: formData.get('env') as string,
        deviceInfo: formData.get('deviceInfo') as string,
        id: formData.get('id') as string,
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        comments: formData.get('comments') as string,
        logJson: formData.get('logs') as string,
        attachments: formData.getAll('attachment[]') as unknown as File[], // Check if this works as expected
        version: version !== null ? (version as string) : undefined,
        commitHash: commitHash !== null ? (commitHash as string) : undefined,
    }
}
