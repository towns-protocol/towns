import { giphy, image, normal, twitter } from './data'

function isImage(url: string) {
    return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/.test(url)
}

export function unfurl(urls: string[]) {
    let data: {}[] = []
    urls.forEach((url) => {
        if (isImage(url)) {
            data.push(image)
        } else if (url.includes('twitter')) {
            data.push(twitter)
        } else if (url.includes('giphy')) {
            data.push(giphy)
        } else {
            data.push(normal)
        }
    })
    return data
}
