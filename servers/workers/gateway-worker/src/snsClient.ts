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
    const snsClient = new SNSClient({
        credentials: { accessKeyId: accessKeyId, secretAccessKey: secretAccessKey },
        region: 'us-east-1',
    })
    const data = await snsClient.send(new PublishCommand(params))
    console.log('Success.', data)
}
