import 'fake-indexeddb/auto' // used to mock indexdb in dexie, don't remove
import { townsEnv, makeSignerContext, NotificationService } from '@towns-protocol/sdk'
import { check } from '@towns-protocol/utils'
import {
    DmChannelSettingValue,
    GdmChannelSettingValue,
    GetSettingsRequestSchema,
    GetSettingsResponseSchema,
    SetDmGdmSettingsRequestSchema,
} from '@towns-protocol/proto'
import { isSet } from './utils/expect'
import { ethers } from 'ethers'
import { getLogger } from './utils/logger'
import { create, toJson } from '@bufbuild/protobuf'

check(isSet(process.env.RIVER_ENV), 'process.env.RIVER_ENV')

const logger = getLogger('stress:index')
const config = townsEnv().makeTownsConfig(process.env.RIVER_ENV)
logger.info(config, 'config')

const registerNotificationService = async () => {
    // demo connecting to the notification service
    const notificationServiceUrl = 'https://river-notification-service-alpha.towns.com/' // ?? 'http://localhost:4040
    if (!notificationServiceUrl) {
        logger.info('NOTIFICATION_SERVICE_URL is not set')
        return
    }

    const wallet = ethers.Wallet.createRandom()
    const delegateWallet = ethers.Wallet.createRandom()
    const signerContext = await makeSignerContext(wallet, delegateWallet, { days: 1 })

    const { startResponse, finishResponse, notificationRpcClient } =
        await NotificationService.authenticate(signerContext, notificationServiceUrl)
    logger.info({ startResponse, finishResponse }, 'authenticated')

    let settings = await notificationRpcClient.getSettings(create(GetSettingsRequestSchema, {}))
    logger.info(toJson(GetSettingsResponseSchema, settings), 'settings')

    const response = await notificationRpcClient.setDmGdmSettings(
        create(SetDmGdmSettingsRequestSchema, {
            dmGlobal: DmChannelSettingValue.DM_MESSAGES_NO,
            gdmGlobal: GdmChannelSettingValue.GDM_MESSAGES_NO,
        }),
    )
    logger.info(response, 'set settings response')
    settings = await notificationRpcClient.getSettings(create(GetSettingsRequestSchema, {}))
    logger.info(toJson(GetSettingsResponseSchema, settings), 'new settings')
}

const run = async () => {
    logger.debug('========================registerNotificationService========================')
    await registerNotificationService()
    process.exit(0)
}

run().catch((e) => {
    logger.error(e, 'unhandled error:')
    process.exit(1)
})
