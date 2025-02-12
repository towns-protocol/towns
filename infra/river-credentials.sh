#!/bin/sh

# Get the river node wallet and db credentials from aws secret manager

if [ -z "$ENV" ]; then
  echo "Please supply the ENV variable"
  exit 1
fi

# exit out if the env is not gamma
if [ "$ENV" != "gamma" ]; then
  echo "This script is only for gamma environment"
  exit 1
fi

# if the env is gamma, there are 11 stream nodes and 0 archive nodes.
# So we should set NUM_STREAM_NODES=11 and NUM_ARCHIVE_NODES=0
if [ "$ENV" = "gamma" ]; then
  NUM_STREAM_NODES=11
  NUM_ARCHIVE_NODES=0
fi

# create the json object
json_object="{"

for i in $(seq 1 $NUM_STREAM_NODES); do
  node_name="${ENV}-full-river${i}"
  db_password_secret_name="${node_name}-db-password"
  wallet_secret_name="${node_name}-wallet-private-key"

  # get the db password
  echo "Getting db password from $db_password_secret_name"
  db_password=$(aws secretsmanager get-secret-value --secret-id $db_password_secret_name --query SecretString --output text)

  # get the wallet private key
  echo "Getting wallet private key from $wallet_secret_name"
  wallet_private_key=$(aws secretsmanager get-secret-value --secret-id $wallet_secret_name --query SecretString --output text)

  # add the node to the json object
  json_object="$json_object\"river-stream-$i\": {\"database_password\": \"$db_password\", \"wallet_private_key\": \"$wallet_private_key\"},"
  
done

# remove the last comma
json_object=$(echo $json_object | sed 's/,$//')

# close the json object
json_object="$json_object}"

# format the json object
json_object=$(echo $json_object | jq .)

# echo the json object
echo $json_object
