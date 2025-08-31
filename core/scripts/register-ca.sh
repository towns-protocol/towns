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

# Function to determine the running environment
function is_macos() {
    [[ $(uname) == "Darwin" ]]
}

function is_ubuntu() {
    [[ $(grep -i ubuntu /etc/os-release 2>/dev/null) ]]
}

function is_github_actions() {
    [[ ! -z "$GITHUB_ACTIONS" ]]
}

# Change to script's directory
cd -P -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Variables
CA_KEY_PATH=~/towns-ca-key.pem
CA_CERT_PATH=~/towns-ca-cert.pem
CA_COMMON_NAME="TownsLocalhostCA"

# Function to check if CA is already registered on macOS
function is_ca_registered_macos() {
    security find-certificate -c "$CA_COMMON_NAME" /Library/Keychains/System.keychain > /dev/null 2>&1
}

# Function to check if CA is already registered on Ubuntu
function is_ca_registered_ubuntu() {
    grep -q "$CA_COMMON_NAME" /etc/ssl/certs/ca-certificates.crt 2>/dev/null || [ -f "/usr/local/share/ca-certificates/towns-ca-cert.crt" ]
}

# Generate CA if it doesn't exist
if [ ! -f "$CA_CERT_PATH" ]; then
    echo "Generating new CA key and certificate..."
    openssl genpkey -algorithm RSA -out $CA_KEY_PATH
    openssl req -new -x509 -key $CA_KEY_PATH -out $CA_CERT_PATH -days 3650 -subj "/CN=$CA_COMMON_NAME"
    echo "Successfully generated new CA key and certificate."
fi

# Register the CA based on environment
if [ "$SKIP_REGISTER" = true ]; then
    echo "Skipping CA registration as per the -s flag."
elif is_macos; then
    if is_ca_registered_macos; then
        echo "CA is already registered in macOS keychain. Skipping registration."
    else
        echo "Registering the CA certificate in macOS keychain..."
        sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CA_CERT_PATH || {
            echo "Failed to register the CA. You may need to manually remove any existing entry and try again."
            exit 1
        }
        echo "Successfully registered the CA certificate in macOS keychain."
    fi
elif is_ubuntu || is_github_actions; then
    if is_ubuntu && is_ca_registered_ubuntu; then
        echo "CA is already registered in Ubuntu certificate store. Skipping registration."
    else
        echo "Registering the CA certificate in Ubuntu certificate store..."
        # Ensure ca-certificates package is installed
        if ! dpkg -l | grep -q ca-certificates; then
            sudo apt-get update
            sudo apt-get install -y ca-certificates
        fi
        
        # Copy certificate to the appropriate directory with .crt extension
        sudo mkdir -p /usr/local/share/ca-certificates/
        sudo cp $CA_CERT_PATH /usr/local/share/ca-certificates/towns-ca-cert.crt
        sudo update-ca-certificates
        echo "Successfully added CA certificate to Ubuntu certificate store."
    fi
else
    echo "Unknown environment. No action taken for CA registration."
fi
