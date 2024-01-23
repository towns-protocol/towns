import { dlog } from '@river/waterproof'
import axios from 'axios'

const kafkaRestProxyUrl = 'http://127.0.0.1:8082' // Replace with your Kafka REST Proxy URL

describe('Stress test', () => {
    test('stress test', async () => {
        async function consumeFromKafka() {
            //Placeholder to see how it will work with Kafka
            try {
                const consumer = await axios.get(`${kafkaRestProxyUrl}/topics/`)
                dlog('Consumer:', consumer.data)
            } catch (error) {
                dlog('Error consuming messages from Kafka')
            }
        }

        await consumeFromKafka()
    })
})
