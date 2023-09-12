#!/bin/bash
set -e

# Initialize flag variables
SKIP_REGISTER=false

# Process flags
while getopts ":s" opt; do
  case ${opt} in
    s ) # Skip registering the CA
      SKIP_REGISTER=true
      ;;
    \? )
      echo "Usage: cmd [-skip]"
      exit 1
      ;;
  esac
done

# Change to script's directory
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Variables
CA_KEY_PATH=~/river-ca-key.pem
CA_CERT_PATH=~/river-ca-cert.pem
CA_COMMON_NAME="RiverLocalhostCA"

# Function to check if CA is already registered
function is_ca_registered() {
    security find-certificate -c "$CA_COMMON_NAME" /Library/Keychains/System.keychain > /dev/null 2>&1
}

# Check if pem file exists
if [ -f "$CA_CERT_PATH" ]; then
    echo "CA certificate already exists at $CA_CERT_PATH. Skipping generation."
else
    echo "Generating new CA key and certificate..."
    openssl genpkey -algorithm RSA -out $CA_KEY_PATH
    openssl req -new -x509 -key $CA_KEY_PATH -out $CA_CERT_PATH -days 3650 -subj "/CN=$CA_COMMON_NAME"
    echo "Successfully generated new CA key and certificate."
fi

# Register the CA certificate with macOS, if not already and if -s flag is not set
if [ "$SKIP_REGISTER" = true ]; then
    echo "Skipping CA registration as per the -s flag."
elif is_ca_registered; then
    echo "CA is already registered in macOS keychain. Skipping registration."
else
    echo "Registering the CA certificate in macOS keychain..."
    sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CA_CERT_PATH || {
        echo "Failed to register the CA. You may need to manually remove any existing entry and try again."
        exit 1
    }
    echo "Successfully registered the CA certificate in macOS keychain."
fi
