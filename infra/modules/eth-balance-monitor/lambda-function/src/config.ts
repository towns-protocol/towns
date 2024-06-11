import { SecretsManager } from '@aws-sdk/client-secrets-manager'
import { isAddress } from 'viem'
import { Unpromisify } from './utils'

function getEnvVars() {
    const {
        ENVIRONMENT,
        DATADOG_API_KEY_SECRET_ARN,
        DATADOG_APPLICATION_KEY_SECRET_ARN,
        RIVER_REGISTRY_CONTRACT_ADDRESS,
        RIVER_CHAIN_RPC_URL_SECRET_ARN,
        BASE_CHAIN_RPC_URL_SECRET_ARN,
    } = process.env
    if (typeof ENVIRONMENT !== 'string' || !ENVIRONMENT.trim().length) {
        throw new Error('ENVIRONMENT is not defined')
    }
    if (
        typeof DATADOG_API_KEY_SECRET_ARN !== 'string' ||
        !DATADOG_API_KEY_SECRET_ARN.trim().length
    ) {
        throw new Error('DATADOG_API_KEY_SECRET_ARN is not defined')
    }
    if (
        typeof RIVER_CHAIN_RPC_URL_SECRET_ARN !== 'string' ||
        !RIVER_CHAIN_RPC_URL_SECRET_ARN.trim().length
    ) {
        throw new Error('RIVER_CHAIN_RPC_URL_SECRET_ARN is not defined')
    }
    if (
        typeof BASE_CHAIN_RPC_URL_SECRET_ARN !== 'string' ||
        !BASE_CHAIN_RPC_URL_SECRET_ARN.trim().length
    ) {
        throw new Error('BASE_CHAIN_RPC_URL_SECRET_ARN is not defined')
    }
    if (
        typeof DATADOG_APPLICATION_KEY_SECRET_ARN !== 'string' ||
        !DATADOG_APPLICATION_KEY_SECRET_ARN.trim().length
    ) {
        throw new Error('DATADOG_APPLICATION_KEY_SECRET_ARN is not defined')
    }
    if (
        typeof RIVER_REGISTRY_CONTRACT_ADDRESS !== 'string' ||
        !RIVER_REGISTRY_CONTRACT_ADDRESS.trim().length
    ) {
        throw new Error('RIVER_REGISTRY_CONTRACT_ADDRESS is not defined')
    }
    return {
        ENVIRONMENT,
        DATADOG_API_KEY_SECRET_ARN,
        DATADOG_APPLICATION_KEY_SECRET_ARN,
        RIVER_CHAIN_RPC_URL_SECRET_ARN,
        BASE_CHAIN_RPC_URL_SECRET_ARN,
        RIVER_REGISTRY_CONTRACT_ADDRESS,
    }
}

async function getSecretValue(secretArn: string): Promise<string> {
    const secretsManager = new SecretsManager({ region: 'us-east-1' })
    const secretValue = await secretsManager.getSecretValue({
        SecretId: secretArn,
    })
    const secretString = secretValue.SecretString
    if (typeof secretString !== 'string') {
        throw new Error(`Secret value for ${secretArn} is not a string`)
    }
    return secretString
}

export async function getConfig() {
    const {
        DATADOG_API_KEY_SECRET_ARN,
        DATADOG_APPLICATION_KEY_SECRET_ARN,
        RIVER_CHAIN_RPC_URL_SECRET_ARN,
        BASE_CHAIN_RPC_URL_SECRET_ARN,
        ENVIRONMENT,
        RIVER_REGISTRY_CONTRACT_ADDRESS,
    } = getEnvVars()
    const datadogApiKey = await getSecretValue(DATADOG_API_KEY_SECRET_ARN)
    const datadogApplicationKey = await getSecretValue(DATADOG_APPLICATION_KEY_SECRET_ARN)
    const riverChainRpcUrl = await getSecretValue(RIVER_CHAIN_RPC_URL_SECRET_ARN)
    const baseChainRpcUrl = await getSecretValue(BASE_CHAIN_RPC_URL_SECRET_ARN)

    if (!isAddress(RIVER_REGISTRY_CONTRACT_ADDRESS)) {
        throw new Error(`Invalid contract address: ${RIVER_REGISTRY_CONTRACT_ADDRESS}`)
    }

    return {
        datadogApiKey,
        datadogApplicationKey,
        riverChainRpcUrl,
        baseChainRpcUrl,
        environment: ENVIRONMENT,
        riverRegistryContractAddress: RIVER_REGISTRY_CONTRACT_ADDRESS,
    }
}

// Exporting the config type by unpromisifying the return type of getConfig
export type Config = Unpromisify<ReturnType<typeof getConfig>>
