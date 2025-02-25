#!/bin/sh

# Get the river node wallet and db credentials from aws secret manager

if [ -z "$ENV" ]; then
  echo "Please supply the ENV variable"
  exit 1
fi

# So we should set NUM_STREAM_NODES=11 and NUM_ARCHIVE_NODES=0
if [ "$ENV" = "gamma" ]; then
  NUM_STREAM_NODES=11
  NUM_ARCHIVE_NODES=0
elif [ "$ENV" = "omega" ]; then
  NUM_STREAM_NODES=0
  NUM_ARCHIVE_NODES=2
elif [ "$ENV" = "alpha" ]; then
  NUM_STREAM_NODES=10
  NUM_ARCHIVE_NODES=0
elif [ "$ENV" = "delta" ]; then
  NUM_STREAM_NODES=10
  NUM_ARCHIVE_NODES=0
else
  echo "Invalid ENV variable"
  exit 1
fi

# create the json object
json_object="{"

if [ $NUM_STREAM_NODES -gt 0 ]; then
  for i in $(seq 1 $NUM_STREAM_NODES); do

    node_name="${ENV}-full-river${i}"
    db_password_secret_name="${node_name}-db-password"
    wallet_secret_name="${node_name}-wallet-private-key"

    # get the db password
    db_password=$(aws secretsmanager get-secret-value --secret-id $db_password_secret_name --query SecretString --output text)

    # get the wallet private key
    wallet_private_key=$(aws secretsmanager get-secret-value --secret-id $wallet_secret_name --query SecretString --output text)

    # add the node to the json object
    json_object="$json_object\"river-stream-$i\": {\"database_password\": \"$db_password\", \"wallet_private_key\": \"$wallet_private_key\"},"
  done
fi

if [ $NUM_ARCHIVE_NODES -gt 0 ]; then
  for i in $(seq 1 $NUM_ARCHIVE_NODES); do
    node_name="${ENV}-archive-river${i}"
    db_password_secret_name="${node_name}-db-password"
    wallet_secret_name="${node_name}-wallet-private-key"

    # get the db password
    db_password=$(aws secretsmanager get-secret-value --secret-id $db_password_secret_name --query SecretString --output text)

    # get the wallet private key
    wallet_private_key=$(aws secretsmanager get-secret-value --secret-id $wallet_secret_name --query SecretString --output text)

    # add the node to the json object
    json_object="$json_object\"river-archive-$i\": {\"database_password\": \"$db_password\", \"wallet_private_key\": \"$wallet_private_key\"},"
  done
fi

# remove the last comma
json_object=$(echo $json_object | sed 's/,$//')

# close the json object
json_object="$json_object}"

# format the json object
json_object=$(echo $json_object | jq .)

# echo the json object
echo $json_object
