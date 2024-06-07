import * as path from 'path'
import * as os from 'os'
import * as v8 from 'v8'
import { DLogger } from '@river-build/dlog'

export function writeHeapSnapshotToFile(log: DLogger) {
    const startWriting = performance.now()
    const tmpDir = os.tmpdir()
    const tmpFilename = path.join(tmpDir, `heapdump-${Date.now()}.heapsnapshot`)
    log('Writing heap snapshot to', tmpFilename)
    v8.writeHeapSnapshot(tmpFilename)
    const endWriting = performance.now()
    log('Heap snapshot written to stdout in ', endWriting - startWriting, ' ms')
}
