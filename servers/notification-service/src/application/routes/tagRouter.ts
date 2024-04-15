import { Router } from 'express'
import { validateSchema } from '../middleware/validation'
import {
    tagAtChannelSchema,
    tagAttachmentSchema,
    tagMentionUsersSchema,
    tagReplyUserSchema,
} from '../schema/tagSchema'
import {
    tagAttachmentHandler,
    tagAtChannelHandler,
    tagMentionUsersHandler,
    tagReplyUserHandler,
} from '../controller/tagHandler'

export const tagRouter = Router()

tagRouter.post('/tag/mention-users', validateSchema(tagMentionUsersSchema), tagMentionUsersHandler)
tagRouter.post('/tag/reply-to-users', validateSchema(tagReplyUserSchema), tagReplyUserHandler)
tagRouter.post('/tag/at-channel', validateSchema(tagAtChannelSchema), tagAtChannelHandler)
tagRouter.post('/tag/attachment', validateSchema(tagAttachmentSchema), tagAttachmentHandler)
