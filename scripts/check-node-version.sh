#!/bin/bash
cd "$(git rev-parse --show-toplevel)"

# Check for the presence of a .nvmrc file
if [ -f .nvmrc ]; then
    # Read the version from the .nvmrc file
    NVM_VERSION=$(cat .nvmrc)

    # Get the current Node version
    CURRENT_VERSION=$(node -v)

    # Strip 'v' prefix if present
    NVM_VERSION_STRIPPED=$(echo "$NVM_VERSION" | sed 's/^v//')
    CURRENT_VERSION_STRIPPED=$(echo "$CURRENT_VERSION" | sed 's/^v//')

    # Extract major versions
    CURRENT_VERSION_MAJOR=$(echo "$CURRENT_VERSION_STRIPPED" | cut -d'.' -f1)
    NVM_VERSION_MAJOR=$(echo "$NVM_VERSION_STRIPPED" | cut -d'.' -f1)

    # Extract minor versions only if a dot exists in the version string
    CURRENT_VERSION_MINOR=$(echo "$CURRENT_VERSION_STRIPPED" | cut -d'.' -f2)
    # Only set NVM_VERSION_MINOR if the .nvmrc version contains a dot
    if echo "$NVM_VERSION_STRIPPED" | grep -q '\.'; then
        NVM_VERSION_MINOR=$(echo "$NVM_VERSION_STRIPPED" | cut -d'.' -f2)
    else
        NVM_VERSION_MINOR=""
    fi

    VERSION_OK=true

    # Compare major versions first
    if [ "$NVM_VERSION_MAJOR" != "$CURRENT_VERSION_MAJOR" ]; then
        VERSION_OK=false
    # If major matches and minor version is specified in .nvmrc, check minor version
    elif [ -n "$NVM_VERSION_MINOR" ]; then
        # Ensure CURRENT_VERSION_MINOR is treated as 0 if empty
        CURRENT_VERSION_MINOR=${CURRENT_VERSION_MINOR:-0}
        if [ "$CURRENT_VERSION_MINOR" -lt "$NVM_VERSION_MINOR" ]; then
            VERSION_OK=false
        fi
    fi

    if [ "$VERSION_OK" = false ]; then
        echo "CURRENT_VERSION_MAJOR: $CURRENT_VERSION_MAJOR"
        echo "NVM_VERSION_MAJOR: $NVM_VERSION_MAJOR"
        echo "CURRENT_VERSION_MINOR: $CURRENT_VERSION_MINOR"
        echo "NVM_VERSION_MINOR: $NVM_VERSION_MINOR"
        echo "Version mismatch: required $NVM_VERSION, current $CURRENT_VERSION"
        echo "Required Node.js version is $(tput setaf 10)$NVM_VERSION$(tput sgr0), but currently $(tput setaf 9)$CURRENT_VERSION$(tput sgr0) is in use."
        echo
        echo "To switch to $(tput setaf 10)$NVM_VERSION$(tput sgr0) run the command $(tput setaf 11)nvm install $NVM_VERSION --lts & nvm alias default $NVM_VERSION & nvm use default$(tput sgr0) and $(tput setaf 10)restart VSCode $(tput sgr0)"
        echo "Press any key to continue"
        read -n 1 -s -r RESPONSE
        echo

        exit 1
    else
        echo
        echo "Correct Node.js version ($NVM_VERSION) is in use."
        echo
    fi
else
    echo ".nvmrc file does not exist!"
fi
