#!/bin/bash

# Variables
KAFKA_CONTAINER_NAME="stress_test_kafka"  # Replace with your Kafka container's name
KAFKA_TOPICS_SCRIPT="/usr/bin/kafka-topics.sh"
KAFKA_BROKER="127.0.0.1:9092"
TOPIC_NAME="main"   # Replace with the name of the topic to delete

# Use docker exec to run the kafka-topics.sh script within the Kafka container
docker exec -it "$KAFKA_CONTAINER_NAME" kafka-topics --list \
  --bootstrap-server 127.0.0.1:9092

# Use docker exec to run the kafka-topics.sh script within the Kafka container
docker exec -it "$KAFKA_CONTAINER_NAME" kafka-topics --delete \
  --topic "$TOPIC_NAME" \
  --if-exists \
  --bootstrap-server 127.0.0.1:9092