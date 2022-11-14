export type Image = {
    url?: string
    width?: number
    height?: number
}

type UnfurlBase = {
    url: string
    description?: string
    title?: string
    image?: Image
}

type GenericUnfurl = UnfurlBase & {
    type: 'generic'
    info?: never
}

type ImageUnfurl = UnfurlBase & {
    type: 'image'
    info?: never
}

export type TwitterUnfurl = UnfurlBase & {
    type: 'twitter'
    info: {
        includes?: {
            users?: {
                profile_image_url: string
                verified: boolean
                protected: boolean
                name: string
                id: string
                username: string
            }[]
            media?: {
                media_key: string
                width: number
                public_metrics: Record<string, unknown>
                height: number
                duration_ms: number
                preview_image_url: string
                type: string
                url: string
            }[]
        }
        data: {
            id: string
            created_at: string
            public_metrics: {
                retweet_count: number
                reply_count: number
                like_count: number
                quote_count: number
            }
            author_id: string
            text: string
            // mentions: []
        }
    }
}

export type UnfurlData = GenericUnfurl | ImageUnfurl | TwitterUnfurl
