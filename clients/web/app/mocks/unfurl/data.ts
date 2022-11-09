// whatever site
export const normal = {
    url: 'https://stackoverflow.com',
    image: {
        url: 'https://cdn.sstatic.net/Sites/stackoverflow/Img/apple-touch-icon@2.png?v=73d79a89bded',
    },
    title: 'Stack Overflow - Where Developers Learn, Share, & Build Careers',
    description:
        'Stack Overflow is the largest, most trusted online community for developers to learn, share​ ​their programming ​knowledge, and build their careers.',
}

//
// raw image
export const image = {
    url: 'https://i.imgur.com/kJdpI5l.jpeg',
    image: { url: 'https://i.imgur.com/kJdpI5l.jpeg' },
    title: 'https://i.imgur.com/kJdpI5l.jpeg',
}

// Giphy
export const giphy = {
    url: 'https://giphy.com/gifs/mlb-baseball-playoffs-astros-rlO48a7OCYB3SIpndR',
    image: {
        url: 'https://media3.giphy.com/media/rlO48a7OCYB3SIpndR/giphy_s.gif?cid=790b761192e439be5bdcdd08d469d4ac888e4b97920a9b5c&rid=giphy_s.gif&ct=g',
    },
    title: 'Heart Love GIF by MLB - Find & Share on GIPHY',
    description:
        'Because where else would you find monstrous home runs, mascots racing and just some old-fashioned bloopers in one place?',
}

// TWITTER
export const twitter = {
    url: 'https://www.twitter.com/twitter/status/1588317338461413377',
    twitterInfo: {
        data: {
            attachments: { media_keys: ['3_1588317334032244738'] },
            created_at: '2022-11-03T23:48:57.000Z',
            public_metrics: {
                retweet_count: 2243,
                reply_count: 2290,
                like_count: 23415,
                quote_count: 2011,
            },
            id: '1588317338461413377',
            text:
                'Breaking: The Nets have suspended Kyrie Irving without pay, the team announced.\n' +
                '\n' +
                'The suspension will be for "no less than five games," the team said. https://t.co/qCpVIc1yZC',
            edit_history_tweet_ids: ['1588317338461413377'],
            author_id: '2557521',
            entities: {
                urls: [
                    {
                        start: 150,
                        end: 173,
                        url: 'https://t.co/qCpVIc1yZC',
                        expanded_url: 'https://twitter.com/espn/status/1588317338461413377/photo/1',
                        display_url: 'pic.twitter.com/qCpVIc1yZC',
                        media_key: '3_1588317334032244738',
                    },
                ],
            },
        },
        includes: {
            media: [
                {
                    type: 'photo',
                    media_key: '3_1588317334032244738',
                    width: 1080,
                    height: 1350,
                    url: 'https://pbs.twimg.com/media/FgrWMzWWYAIjrye.jpg',
                },
            ],
            users: [
                {
                    verified: true,
                    name: 'ESPN',
                    protected: false,
                    url: 'https://t.co/MJhKyVN8QD',
                    profile_image_url:
                        'https://pbs.twimg.com/profile_images/1170690523201527808/FriNRiir_normal.png',
                    username: 'espn',
                    id: '2557521',
                },
            ],
        },
    },
}
