## Introduction

This is a dockerized workflow that combines:

- a river node discovery script
- a prometheus server that dynamically scrapes river nodes using said script
- a datadog agent that collects metrics from the prometheus server and sends them to datadog

## Instructions

For local development, use the .env.example file to create a .env file.

Then run:

```sh
docker-compose up
```

To verify that the datadog agent is getting the metrics, run:

```sh
docker exec -it datadog agent status
```

You should begin seeing a non-zero count for the prometheus metric samples, e.g.:

```
prometheus (3.6.0)
    ------------------
      Instance ID: prometheus:river-node:96bb1bb9996cfb9a [OK]
      Configuration Source: file:/etc/datadog-agent/conf.d/prometheus.d/conf.yaml
      Total Runs: 6
      Metric Samples: Last Run: 4,762, Total: 23,339
      Events: Last Run: 0, Total: 0
      Service Checks: Last Run: 1, Total: 6
      Average Execution Time : 145ms
      Last Execution Date : 2024-07-02 21:27:10 UTC (1719955630000)
      Last Successful Execution Date : 2024-07-02 21:27:10 UTC (1719955630000)
```
