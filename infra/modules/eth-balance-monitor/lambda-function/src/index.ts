import { APIGatewayProxyEvent, APIGatewayProxyResult, Handler } from 'aws-lambda'
import { getConfig } from './config'
import { execute } from './execute'

export const handler: Handler = async (
    _event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const config = await getConfig()
    await execute(config)

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: `Successfully posted wallet balances to Datadog for ${config.environment}`,
        }),
    }
}
