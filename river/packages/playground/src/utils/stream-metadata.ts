export const getStreamMetadataUrl = (environmentId: string) => {
    switch (environmentId) {
        case 'alpha':
            return 'https://alpha.river.delivery'
        case 'gamma':
            return 'https://gamma.river.delivery'
        case 'omega':
            return 'https://river.delivery'
        default:
            return ''
    }
}
