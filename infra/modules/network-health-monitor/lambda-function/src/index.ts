import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda'
import { getConfig } from './config'
import { handleDatadogJob } from './datadog'

export const handler: Handler = async (
    _event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const config = await getConfig()
    await handleDatadogJob(config)
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: `Successfully posted Dataodog metrics for ${config.environment}`,
        }),
    }
}
