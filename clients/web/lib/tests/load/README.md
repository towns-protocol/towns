# Load testing

## How to run load tests

Load tests require Redis up and running as in some cases there are more than one jest process running in parallel and they need to talk to each other.
To start docker container from VS Code the task **_"Start Load Testing Redis (from docker compose)"_** can be used or console command `./scripts/start_load_testing_redis.sh` from the root of the repository

## List of load tests

### User can join a channel with 10K messages within 600 ms.

Scripts to run:
_initiator.test.js
receiver.test.js_

Scenario:

- User 1 create Space and Channel
- User 2-10 join this Channel
- User 1-10 send 1000 messages each to this Channel
- User 11 joins this Channel and we measure time required to get latest message from at least on of the first 10 users. This time should be less than 500 ms
