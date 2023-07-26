import UAParser from 'ua-parser-js'

const UserAgentInstance = new UAParser(window.navigator.userAgent)

export function isTouch() {
    const device = UserAgentInstance.getDevice()
    return device.type === 'mobile' || device.type === 'tablet'
}

export function useDevice() {
    return {
        isTouch: isTouch(),
        isPWA: matchMedia !== undefined && matchMedia('(display-mode: standalone)').matches,
    }
}
