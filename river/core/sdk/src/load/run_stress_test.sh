#!/bin/bash

# Stress test kafka container name
KAFKA_CONTAINER_NAME="stress_test_kafka"

# Stress test main topic
TOPIC_NAME="main"
CONSUMER_GROUP="stress-test-consumer-group"

# Create a topic using Kafka container's shell
docker exec -it "$KAFKA_CONTAINER_NAME" kafka-topics --create \
  --topic "$TOPIC_NAME" \
  --partitions 1 \
  --replication-factor 1 \
  --if-not-exists \
  --bootstrap-server 127.0.0.1:9092

