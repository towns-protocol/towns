import { env } from 'process'
import { dlogger } from '@river-build/dlog'
import { NotificationService } from './notificationService'
import { ethers } from 'ethers'
import {
    DmChannelSettingValue,
    GdmChannelSettingValue,
    GetSettingsRequest,
    SetDmGdmSettingsRequest,
} from '@river-build/proto'
import { makeSignerContext } from './signerContext'

const logger = dlogger('notificationService.test')

describe('notificationServicetest', () => {
    // NOTE: at this time the service only accepts http2 connections so you can't connect to alpha from a jest test
    test('login with primary key', async () => {
        const notificationServiceUrl = env.NOTIFICATION_SERVICE_URL // ?? 'https://river-notification-service-alpha.towns.com/' // ?? 'http://localhost:4040
        if (!notificationServiceUrl) {
            logger.info('NOTIFICATION_SERVICE_URL is not set')
            return
        }

        const wallet = ethers.Wallet.createRandom()
        const signer: ethers.Signer = wallet
        const userId = wallet.address

        const { startResponse, finishResponse, notificationRpcClient } =
            await NotificationService.authenticateWithSigner(userId, signer, notificationServiceUrl)
        logger.info('authenticated', { startResponse, finishResponse })

        const settings = await notificationRpcClient.getSettings(new GetSettingsRequest())
        logger.info('settings', settings)

        const newSettings = await notificationRpcClient.setDmGdmSettings(
            new SetDmGdmSettingsRequest({
                dmGlobal: DmChannelSettingValue.DM_MESSAGES_NO,
                gdmGlobal: GdmChannelSettingValue.GDM_MESSAGES_NO,
            }),
        )
        logger.info('new settings', newSettings)
    })

    // NOTE: at this time the service only accepts http2 connections so you can't connect to alpha from a jest test
    test('login with delegate key', async () => {
        const notificationServiceUrl = env.NOTIFICATION_SERVICE_URL // ?? 'https://river-notification-service-alpha.towns.com/' // ?? 'http://localhost:4040
        if (!notificationServiceUrl) {
            logger.info('NOTIFICATION_SERVICE_URL is not set')
            return
        }

        const wallet = ethers.Wallet.createRandom()
        const delegateWallet = ethers.Wallet.createRandom()
        const signerContext = await makeSignerContext(wallet, delegateWallet, { days: 1 })

        const { startResponse, finishResponse, notificationRpcClient } =
            await NotificationService.authenticate(signerContext, notificationServiceUrl)
        logger.info('authenticated', { startResponse, finishResponse })

        const settings = await notificationRpcClient.getSettings(new GetSettingsRequest())
        logger.info('settings', settings)

        const newSettings = await notificationRpcClient.setDmGdmSettings(
            new SetDmGdmSettingsRequest({
                dmGlobal: DmChannelSettingValue.DM_MESSAGES_NO,
                gdmGlobal: GdmChannelSettingValue.GDM_MESSAGES_NO,
            }),
        )
        logger.info('new settings', newSettings)
    })
})
