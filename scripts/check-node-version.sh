#!/bin/bash
cd "$(git rev-parse --show-toplevel)"

# Check for the presence of a .nvmrc file
if [ -f .nvmrc ]; then
    # Read the version from the .nvmrc file
    NVM_VERSION=$(cat .nvmrc)

    # Get the current Node version
    CURRENT_VERSION=$(node -v)

    CURRENT_VERSION_MAJOR=$(echo $CURRENT_VERSION | cut -d'.' -f1)

    # Compare the versions
    if [ $NVM_VERSION != $CURRENT_VERSION_MAJOR ]; then
        echo
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
