// OLM_OPTIONS is undefined https://gitlab.matrix.org/matrix-org/olm/-/issues/10
// but this comment suggests we define it ourselves? https://gitlab.matrix.org/matrix-org/olm/-/blob/master/javascript/olm_pre.js#L22-24
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.OLM_OPTIONS = {}
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import olmWasm from '@matrix-org/olm/olm.wasm?url'
import Olm from '@matrix-org/olm'

export function loadOlm(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return Olm.init({ locateFile: () => olmWasm })
        .then(() => {
            console.log('Using WebAssembly Olm')
        })
        .catch(() => {
            // wasm has good browser support https://caniuse.com/wasm, TBD if we need this
            return new Promise((resolve, reject) => {
                // this won't work with webpack for now
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const _file = import('@matrix-org/olm/olm_legacy.js?url').then(
                    (m: { default: string }) => {
                        const s = document.createElement('script')
                        s.src = m.default
                        s.onload = resolve
                        s.onerror = reject
                        document.body.appendChild(s)
                    },
                )
            })
                .then(() => {
                    // Init window.Olm, ie. the one just loaded by the script tag,
                    // not 'Olm' which is still the failed wasm version.
                    return window.Olm.init()
                })
                .then(() => {
                    console.log('Using legacy Olm')
                })
                .catch((legacyLoadError) => {
                    console.log('Both WebAssembly and asm.js Olm failed!', legacyLoadError)
                })
        })
}
