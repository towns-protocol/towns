import { LogsInitConfiguration, datadogLogs } from '@datadog/browser-logs'
import datadogSDKPackageJSON from '@datadog/browser-logs/package.json'
import webAppPackageJSON from '../package.json'
import { env } from './utils'

const getDDSettings = () => {
    if (env.VITE_DD_CLIENT_TOKEN) {
        const ddSettings: LogsInitConfiguration = {
            clientToken: env.VITE_DD_CLIENT_TOKEN,
            service: 'towns-webapp',
            forwardConsoleLogs: ['error', 'warn'],
            forwardErrorsToLogs: true,
            sessionSampleRate: env.VITE_LOG_SAMPLING_RATE,
            telemetrySampleRate: 0,
            env: env.VITE_RIVER_ENV || 'dev',
            version: VITE_APP_VERSION,
        }
        return ddSettings
    }
}

export const initDatadog = () => {
    const ddSettings = getDDSettings()
    if (ddSettings) {
        datadogLogs.init(ddSettings)
        // logging with console.warn to make sure the logs make it to datadog
        console.warn(`datadogLogs initialized`, {
            sdkVersion: datadogSDKPackageJSON.version,
            appVersion: webAppPackageJSON.version,
            commitHash: VITE_APP_COMMIT_HASH,
        })
    } else {
        console.warn('datadogLogs not initialized')
    }
}

// This is a workaround configuration for situations where regular console.log calls
// are not properly decorated with datadog wrappers (e.g Service Workers)
export const getDDLogApiURL = () => {
    const ddSettings = getDDSettings()
    if (!ddSettings) {
        return
    }
    const requestId = Math.random().toString(36).substring(2)
    const tags = [
        `sdk_version:${datadogSDKPackageJSON.version}`,
        `api:fetch`,
        `env:${ddSettings.env}`,
        `service:${ddSettings.service}`,
        `version:${ddSettings.version}`,
        `via:url`,
    ].join(',')
    const queryParams = new URLSearchParams({
        ddsource: 'browser',
        ddtags: tags,
        'dd-api-key': ddSettings.clientToken,
        'dd-evp-origin-version': datadogSDKPackageJSON.version,
        'dd-evp-origin': 'browser',
        'dd-request-id': requestId,
    }).toString()

    return `https://logs.browser-intake-datadoghq.com/api/v2/logs?${queryParams}`
}
