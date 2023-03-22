import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'

type Params = {
    Message: string // MESSAGE_TEXT
    TopicArn: string //TOPIC_ARN
}

export const sendSnsTopic = async (
    params: Params,
    accessKeyId: string,
    secretAccessKey: string,
) => {
    try {
        const snsClient = new SNSClient({
            credentials: { accessKeyId: accessKeyId, secretAccessKey: secretAccessKey },
            region: 'us-east-1',
        })
        const data = await snsClient.send(new PublishCommand(params))
        console.log('Success.', data)
        return new Response(JSON.parse(JSON.stringify(data)), { status: 200 })
    } catch (error) {
        console.log('Error.', error)
        return new Response(JSON.stringify({ error: (error as Error).message }), {
            status: 500,
        })
    }
}
