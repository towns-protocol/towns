export type Image = {
    url?: string
    width?: number
    height?: number
}

export type TwitterUser = {
    profile_image_url: string
    verified: boolean
    protected: boolean
    name: string
    id: string
    username: string
}

export type TwitterMedia = {
    media_key: string
    width: number
    public_metrics: Record<string, unknown>
    height: number
    duration_ms: number
    preview_image_url: string
    type: string
}

// todo: spec more
export type TwitterData = {
    id: string
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

export type UnfurlData = {
    image?: Image
    title?: string
    description?: string
    url: string
    type: 'image' | 'twitter' | 'other'
    twitterInfo?: {
        includes: {
            users?: TwitterUser[]
            media?: TwitterMedia[]
        }
        data: TwitterData
    }
}
