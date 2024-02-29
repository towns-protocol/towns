const twitterParams = {
    expansions:
        'author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id,attachments.poll_ids',
    'tweet.fields':
        'attachments,author_id,public_metrics,created_at,id,in_reply_to_user_id,referenced_tweets,text,entities',
    'user.fields': 'id,name,profile_image_url,protected,url,username,verified',
    'media.fields': 'duration_ms,height,media_key,preview_image_url,type,url,width,public_metrics',
    'poll.fields': 'duration_minutes,end_datetime,id,options,voting_status',
}

export const queryParams = new URLSearchParams(twitterParams).toString()

export function checkForTweetIdFromUrl(url: string) {
    const twitterRegex = /^https?:\/\/(www\.)?twitter\.com\/(\w+)\/status(es)*\/(\d+)/
    const match = url.match(twitterRegex)
    if (!match) {
        return null
    }
    return match[4]
}

// There is a whole bunch of stuff returned from the Twitter API
// For now just returning all of it so that the client can pick and choose what it needs
// and later we can limit what is returned
export async function getTweet(id: string, token: string) {
    const response = await fetch(`https://api.twitter.com/2/tweets/${id}?${queryParams}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })
    return response
}
