import { LinearConfig } from './linearConfig'

interface IssueCreateInput {
    config: LinearConfig
    name: string
    comments: string
    id: string
    email?: string
    logFilename?: string
    logUrl?: string
}

export async function createIssue({
    config,
    comments,
    name,
    email,
    id,
    logFilename,
    logUrl,
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
    const issueTitleRaw = `[User Feedback] ${comments}`
    const issueTitle =
        issueTitleRaw.length > issueTitleCutoff
            ? issueTitleRaw.substring(0, issueTitleCutoff) + '...'
            : issueTitleRaw

    const logInfo = logFilename && logUrl ? `Logs: [${logFilename}](${logUrl})` : ''
    const issueDescription = [
        `**Name**: ${name}`,
        `**Email**: ${email}`,
        '### User Feedback:',
        comments,
        '### Logs:',
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
    console.log('Issue create response', res.status, res.statusText, await res.text())
}
