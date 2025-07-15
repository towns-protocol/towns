import workerpool from 'workerpool'
import { createUnpacker } from '@towns-protocol/sdk'

workerpool.worker(createUnpacker())
