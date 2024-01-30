import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { database } from '../../infrastructure/database/prisma'
import { PushType } from '../schema/subscription'

export async function subscriptionHandler(request: Request, res: Response) {
    try {
        const subscriptionData = {
            UserId: request.body.userId,
            PushSubscription: JSON.stringify(request.body.subscriptionObject),
            PushType: request.body.pushType ?? PushType.WebPush,
        }

        const subscription = await database.pushSubscription.upsert({
            where: { PushSubscription: subscriptionData.PushSubscription },
            create: subscriptionData,
            update: {
                UserId: subscriptionData.UserId,
            },
        })
        return res.status(StatusCodes.OK).json(subscription)
    } catch (error) {
        console.error(error)
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({ error: 'Invalid data' })
    }
}
