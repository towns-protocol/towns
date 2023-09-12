#!/bin/bash
set -e

# Change to script's directory
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Variables
CA_KEY_PATH=~/river-ca-key.pem
CA_CERT_PATH=~/river-ca-cert.pem
SERVER_KEY_PATH=../node/run_files/key.pem
SERVER_CERT_PATH=../node/run_files/cert.pem

# Check if server certs already exist
if [[ -f "$SERVER_KEY_PATH" && -f "$SERVER_CERT_PATH" ]]; then
    echo "Server certs already exist. Skipping..."
    exit 0
fi

# Validate CA files are present
if [[ ! -f "$CA_KEY_PATH" || ! -f "$CA_CERT_PATH" ]]; then
    echo "CA files not found. Run the CA script first."
    exit 1
fi

echo "Generating server certs..."
current_user=$(whoami)
email="${current_user}@hntlabs.com"

# Generate server key and CSR
openssl req -newkey rsa:2048 -nodes -keyout $SERVER_KEY_PATH -out ../node/run_files/csr.pem \
    -subj "/C=US/ST=Some-State/L=Some-City/O=Some-Organization/OU=Some-Unit/CN=localhost_river.com/emailAddress=${email}" \
    -reqexts SAN \
    -config <(cat /etc/ssl/openssl.cnf <(printf "\n[SAN]\nsubjectAltName=DNS:localhost_river.com,DNS:localhost,IP:127.0.0.1"))

# Create a temporary file for extfile.cnf with a relevant name
EXTFILE_TEMP=$(mktemp  -t extfileXXXX.cnf)

# Function to clean up the temporary file
cleanup() {
  rm -f $EXTFILE_TEMP
}

# Set trap to run the cleanup function on exit, interrupt, or termination
trap cleanup EXIT INT TERM

# Generate extfile for SAN
echo "subjectAltName=DNS:localhost_river.com,DNS:localhost,IP:127.0.0.1" > $EXTFILE_TEMP

# Generate server certificate using CA
openssl x509 -req -in ../node/run_files/csr.pem -CA $CA_CERT_PATH -CAkey $CA_KEY_PATH -CAcreateserial -out $SERVER_CERT_PATH -days 3650 -extfile $EXTFILE_TEMP

# Error handling for OpenSSL
if [[ $? -ne 0 ]]; then
    echo "OpenSSL failed. Exiting."
    exit 1
fi

