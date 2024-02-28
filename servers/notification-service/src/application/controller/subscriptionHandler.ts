import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { database } from '../../infrastructure/database/prisma'
import { PushType } from '../schema/subscriptionSchema'

export async function addSubscriptionHandler(request: Request, res: Response) {
    try {
        console.log('addSubscriptionHandler userId', request.body.userId)
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

export async function removeSubscriptionHandler(request: Request, res: Response) {
    const subscriptionData = {
        PushSubscription: JSON.stringify(request.body.subscriptionObject),
        UserId: request.body.userId,
    }

    const existingSubscription = await database.pushSubscription.findUnique({
        where: subscriptionData,
    })

    if (!existingSubscription) {
        return res.status(StatusCodes.NOT_FOUND).json({ error: 'Subscription not found' })
    }

    await database.pushSubscription.delete({
        where: subscriptionData,
    })

    return res.sendStatus(StatusCodes.NO_CONTENT)
}
