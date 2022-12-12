import { Env } from '../src/types'
import { MockAgent } from 'undici'

declare global {
    function getMiniflareBindings(): Env
    function getMiniflareFetchMock(): MockAgent
}
