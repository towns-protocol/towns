#!/bin/bash
set -e
# Change to script's directory
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Check if directory argument is provided
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <output_directory>"
    exit 1
fi

OUTPUT_DIR=$1

# Check if the provided directory exists
if [ ! -d "$OUTPUT_DIR" ]; then
    echo "Directory '$OUTPUT_DIR' does not exist. Exiting."
    exit 1
fi

# Variables
CA_KEY_PATH=~/towns-ca-key.pem
CA_CERT_PATH=~/towns-ca-cert.pem
SERVER_KEY_PATH="$OUTPUT_DIR/key.pem"
SERVER_CERT_PATH="$OUTPUT_DIR/cert.pem"
CSR_PATH="$OUTPUT_DIR/csr.pem"

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

# Determine if we're on Ubuntu or macOS to handle OpenSSL config location
if [[ $(uname) == "Darwin" ]]; then
    OPENSSL_CNF_PATH="/etc/ssl/openssl.cnf"
elif [[ $(grep -i ubuntu /etc/os-release 2>/dev/null) ]]; then
    OPENSSL_CNF_PATH="/etc/ssl/openssl.cnf"
    # On Ubuntu 22.04, the config might be in a different location
    if [ ! -f "$OPENSSL_CNF_PATH" ]; then
        OPENSSL_CNF_PATH="/usr/lib/ssl/openssl.cnf"
    fi
else
    # Default fallback
    OPENSSL_CNF_PATH="/etc/ssl/openssl.cnf"
fi

# Check if the OpenSSL config file exists
if [ ! -f "$OPENSSL_CNF_PATH" ]; then
    echo "Error: OpenSSL configuration file not found at $OPENSSL_CNF_PATH"
    echo "Please install openssl or specify the correct path."
    exit 1
fi

# Generate server key and CSR
openssl req -newkey rsa:2048 -nodes -keyout $SERVER_KEY_PATH -out $CSR_PATH \
    -subj "/C=US/ST=Some-State/L=Some-City/O=Some-Organization/OU=Some-Unit/CN=towns/emailAddress=${email}" \
    -reqexts SAN \
    -config <(cat "$OPENSSL_CNF_PATH" <(printf "\n[SAN]\nsubjectAltName=DNS:localhost,IP:127.0.0.1"))

# Create a temporary file for extfile.cnf with a relevant name
EXTFILE_TEMP=$(mktemp -t extfileXXXX.cnf)

# Function to clean up the temporary file
cleanup() {
  rm -f $EXTFILE_TEMP
}

# Set trap to run the cleanup function on exit, interrupt, or termination
trap cleanup EXIT INT TERM

# Generate extfile for SAN, Key Usage, and Extended Key Usage
cat <<EOF > $EXTFILE_TEMP
[SAN]
subjectAltName=DNS:localhost,IP:127.0.0.1
keyUsage=digitalSignature, keyEncipherment
extendedKeyUsage=serverAuth
EOF

# Generate server certificate using CA
openssl x509 -req -in $CSR_PATH -CA $CA_CERT_PATH -CAkey $CA_KEY_PATH -CAcreateserial \
    -out $SERVER_CERT_PATH -days 365 -extfile $EXTFILE_TEMP -extensions SAN

# Error handling for OpenSSL
if [[ $? -ne 0 ]]; then
    echo "OpenSSL failed. Exiting."
    exit 1
fi

echo "Generated server certs in $OUTPUT_DIR"