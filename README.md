# Harmony

Welcome to the Harmony mono repo. Here you will find all of the components to run the complete Harmony service, including clients, services, protocols and contracts. As new components directories are added please update this readme to give a summary overview, and indicate if the component origin is Harmony, or if a component is a fork of a component that should be tracked.


/contracts - Smart contracts related to the operation of the Harmony network.

/clients - All client sources, including any external repos.

/servers - All server sources, including any external repos.

# Prerequisites 

- Node v16.x.x, I recommend using nvm to install node: https://github.com/nvm-sh/nvm, then you can run `nvm use` to switch to the node version specified in .nvmrc, or `nvm alias default 16.3` to set the default version across all of your terminals

- golang https://go.dev/

- `npm install --global yarn` We're using yarn 2, which means that there should only be one node_modules folder and one yarn.lock file at the root of the repository. yarn 2 installation instructions are here https://yarnpkg.com/getting-started/install, if you're already using yarn it will automatically upgrade you behind the scenes.


# Setup

1. Run `yarn install` and `yarn prepare` from the root of the repository

2) Run a dendrite server. Follow instructions in /servers/README.md "Build and Run Dendrite"

3) Launch the sample app. Follow instructions in /clients/web/sample-app