import { LinearConfig } from './linearConfig'
import { Uploaded } from './uploadLogFile'

interface IssueCreateInput {
    config: LinearConfig
    deviceInfo: string
    env: string
    name: string
    comments: string
    id: string
    email?: string
    logFilename?: string
    logUrl?: string
    attachments?: Uploaded[]
    version?: string
    commitHash?: string
}

export async function createIssue({
    config,
    deviceInfo,
    env,
    comments,
    name,
    email,
    id,
    logFilename,
    logUrl,
    attachments,
    version,
    commitHash,
}: IssueCreateInput): Promise<void> {
    const mutation = `
mutation CreateIssue($issueTitle: String!, $issueDescription: String!){
    issueCreate(
        input: {
            title: $issueTitle
            description: $issueDescription
            teamId: "${config.teamId}"
            projectId: "${config.userFeedbackProjectId}"
            id: "${id}"
        }
    ) {
        success
    }
}
`
    const issueTitleCutoff = 80
    const issueTitleRaw = `[${env}][${version ?? '0.0.0'}][${commitHash ?? ''}] ${comments}`
    const issueTitle =
        issueTitleRaw.length > issueTitleCutoff
            ? issueTitleRaw.substring(0, issueTitleCutoff) + '...'
            : issueTitleRaw

    const logInfo = logFilename && logUrl ? `* [${logFilename}](${logUrl})` : ''
    const attachmentInfo = attachments
        ?.map((attachment) =>
            attachment.contentType?.includes('image')
                ? `![${attachment.filename}](${attachment.fileUrl})`
                : `[${attachment.filename}](${attachment.fileUrl})`,
        )
        .join('\n')

    const date = new Date()
    const issueDescription = [
        `**Name**: ${name}`,
        `**Email**: ${email}`,
        '### User Feedback:',
        comments,
        '### Attachments:',
        attachmentInfo,
        '### Logs:',
        `* Date UTC: ${date.toUTCString()}`,
        `* Date PST: ${date.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`,
        `**Device Info**:`,
        deviceInfo,
        logInfo,
    ].join('\n\n')

    const variables = {
        issueTitle,
        issueDescription,
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
    console.log('Issue create response', res)
}
