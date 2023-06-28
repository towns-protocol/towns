export function isTouch() {
    return matchMedia !== undefined && matchMedia('(hover: none)').matches
}

export function useDevice() {
    return {
        isTouch: isTouch(),
        isPWA: matchMedia !== undefined && matchMedia('(display-mode: standalone)').matches,
    }
}
