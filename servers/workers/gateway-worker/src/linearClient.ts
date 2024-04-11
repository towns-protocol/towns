export const createLinearIssue = async (params: {
    apiKey: string
    name: string
    email: string
    comments: string
    id: string
}) => {
    const teamId = '2de99085-cb4a-4fd2-89c7-a892c91c0383'
    const userFeedback_ProjectId = '56801874-57ba-42e7-a9ae-5052b27500eb'
    const bugsStableEnvironment_ProjectId = 'ab916e54-519b-4372-8ef9-cc2ba2ec8637'
    const url = 'https://api.linear.app/graphql' // Replace with the appropriate Linear API endpoint

    // GraphQL query
    const mutation = `
mutation CreateIssue($issueTitle: String!, $issueDescription: String!){
    issueCreate(
        input: {
            title: $issueTitle
            description: $issueDescription
            teamId: "${teamId}"
            projectId: "${userFeedback_ProjectId}"
        }
    ) {
        success
    }
}
`
    const issueTitleCutoff = 80

    const name = params.name
    const email = params.email

    const issueTitleRaw = `[User Feedback] ${params.comments}`
    const issueTitle =
        issueTitleRaw.length > issueTitleCutoff
            ? issueTitleRaw.substring(0, issueTitleCutoff) + '...'
            : issueTitleRaw

    // const datadogSessionUrl = `https://app.datadoghq.com/rum/sessions?query=@type:action%20@application.id:c6afdc65-2431-48ff-b8f2-c4879fc75293%20@action.name:user-feedback-custom-error%20@context.id:${params.id}&cols=&saved-view-id=2282427`

    const issueDescription = [
        `**Name**: ${name}`,
        `**Email**: ${email}`,
        // `**Datadog Session**: ${datadogSessionUrl}`,
        '### User Feedback:',
        params.comments,
    ].join('\n\n')

    const variables = {
        issueTitle,
        issueDescription,
    }

    const graphql = JSON.stringify({
        query: mutation,
        variables,
    })

    await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `${params.apiKey}`,
        },
        body: graphql,
    })
}
