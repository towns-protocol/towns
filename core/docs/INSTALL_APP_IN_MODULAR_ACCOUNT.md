# INSTALL_APP_IN_MODULAR_ACCOUNT - App Installation in ERC6900 Modular Accounts

## Overview

This document explains how to install an app (bot module) in an ERC6900 modular account in the Towns Protocol. There are **two account types** that support app installation:

1. **Space-Based Accounts** - Used by Spaces to manage apps
2. **Modular User Accounts** - Used by individual users (e.g., for bot DMs)

## Two-Level Installation Process

Installing an app requires **two levels** of setup:

| Level | What | Description |
|-------|------|-------------|
| **Level 1** | Install AccountModules | User's account gets app management capabilities (`onInstallApp`, `isAppInstalled`, etc.) |
| **Level 2** | Install Individual App | User installs a specific app (bot) using the capabilities from Level 1 |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LEVEL 1: ACCOUNT SETUP (One-time)                         │
│                                                                              │
│   User's Smart Account  ──installExecution()──►  AccountModules Diamond     │
│                                                  (AccountHubFacet +          │
│                                                   AppManagerFacet)           │
│                                                                              │
│   Result: Account now has onInstallApp(), isAppInstalled(), etc.            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LEVEL 2: APP INSTALLATION (Per app)                       │
│                                                                              │
│   User calls: account.onInstallApp(botAppId, data)                          │
│                         │                                                    │
│                         ▼                                                    │
│   AppManagerFacet ──► AppManagerMod ──► AppRegistry (fetch app details)     │
│                                    │                                         │
│                                    ▼                                         │
│                         Store in Diamond storage                             │
│                         Call app.onInstall()                                 │
│                                                                              │
│   Result: Specific bot app is now installed on user's account               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Architecture Summary

### Component Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                     AccountModules (Diamond)                     │
│            Deployed address in accountModules.json               │
│                                                                  │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│  │    AccountHubFacet      │  │     AppManagerFacet         │   │
│  │    (Coordinator)        │  │     (App Lifecycle)         │   │
│  │                         │  │                             │   │
│  │  - getAppRegistry()     │  │  - onInstallApp()           │   │
│  │  - getSpaceFactory()    │  │  - onUninstallApp()         │   │
│  │  - executionManifest()  │  │  - isAppInstalled()         │   │
│  │  - onInstall/onUninstall│  │  - enableApp/disableApp     │   │
│  └────────────┬────────────┘  └──────────────┬──────────────┘   │
│               │                              │                   │
│               │         delegates to         │                   │
│               ▼                              ▼                   │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│  │    AccountHubMod        │  │     AppManagerMod           │   │
│  │    (Storage/Config)     │  │     (Business Logic)        │   │
│  └─────────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ fetches app details from
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        App Registry                              │
│   (Stores registered apps with appId, module, permissions)       │
└─────────────────────────────────────────────────────────────────┘
```

### Full Installation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Registry                              │
│   (Stores registered apps with appId, module, permissions)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AppInstallerFacet                           │
│   installApp(app, account, data) → triggers account.onInstallApp │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   Space AppAccount      │     │   User AppManagerFacet   │
│   (AppAccountBase.sol)  │     │   (AppManagerMod.sol)    │
└─────────────────────────┘     └─────────────────────────┘
```

## Key Contracts

| Contract | Path | Purpose |
|----------|------|---------|
| `IAppAccount` | `src/spaces/facets/account/IAppAccount.sol` | Interface for app management |
| `AppInstallerFacet` | `src/apps/facets/installer/AppInstallerFacet.sol` | Entry point for installation |
| `AppRegistryBase` | `src/apps/facets/registry/AppRegistryBase.sol` | App registration and lookup |
| `AppManagerFacet` | `src/account/facets/app/AppManagerFacet.sol` | User account app management |
| `AppManagerMod` | `src/account/facets/app/AppManagerMod.sol` | User account app logic library |
| `AppAccountBase` | `src/spaces/facets/account/AppAccountBase.sol` | Space account app management |

## Installation Flow

### Option 1: Via AppInstallerFacet (Recommended for Spaces)

```solidity
// User calls the App Registry's installer
AppInstallerFacet.installApp(
    ITownsApp app,      // The app contract address
    IAppAccount space,  // The space/account to install to
    bytes calldata data // Optional init data for the app
);
```

**Internal Flow:**
1. `installApp()` validates caller has permission (`onlyAllowed(space)`)
2. Calls `_installApp()` in `AppRegistryBase`:
   - Fetches app from registry using `appId`
   - Validates app is registered and not banned
   - Charges payment (protocol fee + developer fee)
   - Calls `account.onInstallApp(appId, data)`
3. Account stores app installation state
4. Calls `IModule.onInstall(data)` on the app module

### Option 2: Direct Call to Account (For User Modular Accounts)

For user modular accounts (ERC6900), users can call directly:

```solidity
// User's modular account calls AppManagerFacet
IAppAccount(userAccount).onInstallApp(
    bytes32 appId,      // The app's registry ID (EAS attestation UID)
    bytes calldata data // Optional init data
);
```

**Internal Flow (AppManagerMod.installApp):**
1. Validates `appId` is not empty
2. Fetches app from registry
3. Validates app not already installed
4. Stores installation data:
   - Adds `appId` to account's app set
   - Maps `app address → appId`
   - Records `installedAt`, `expiration`, `active=true`
5. Calls `IModule.onInstall(data)` if data provided

## Storage Structure (User Accounts)

```solidity
// AppManagerMod.sol
struct Layout {
    mapping(address account => EnumerableSetLib.Bytes32Set) apps;  // App IDs per account
    mapping(address account => mapping(bytes32 appId => App)) appById;
    mapping(address account => mapping(address app => bytes32 appId)) appIdByApp;
}

struct App {
    bytes32 appId;        // Reference to registry app ID
    address app;          // Module address
    uint48 installedAt;   // Installation timestamp
    uint48 expiration;    // When subscription expires
    bool active;          // Enable/disable flag
}
```

## Checking Installation Status

```solidity
// From any contract
IAppAccount(userAccount).isAppInstalled(address app) returns (bool)

// Implementation (AppManagerMod.sol line 192):
function isAppInstalled(address account, address app) view returns (bool) {
    Layout storage $ = getStorage();
    bytes32 appId = $.appIdByApp[account][app];
    return appId != EMPTY_UID && $.appById[account][appId].active;
}
```

## App Lifecycle Operations

| Operation | Function | Description |
|-----------|----------|-------------|
| Install | `onInstallApp(appId, data)` | Install app with optional init data |
| Uninstall | `onUninstallApp(appId, data)` | Remove app completely |
| Enable | `enableApp(app)` | Re-enable a disabled app |
| Disable | `disableApp(app)` | Pause app without uninstalling |
| Renew | `onRenewApp(appId, data)` | Extend subscription |
| Update | `onUpdateApp(appId, data)` | Swap to new app version |

## Bot DM Use Case

For the bot DM feature, the complete flow is:

### Prerequisites (One-time setup)
1. **Bot developer** registers their app in the AppRegistry
2. **User** installs AccountModules on their smart account (Level 1):
   ```solidity
   // User's account installs the AccountModules execution module
   userAccount.installExecution(
       accountModulesAddress,
       accountHub.executionManifest(),
       abi.encode(address(userAccount))
   );
   ```

### App Installation (Per bot)
3. **User** installs the bot's app module in their modular account (Level 2):
   ```solidity
   userAccount.onInstallApp(botAppId, "");
   ```

### Runtime Check
4. **River node** checks installation before allowing DM:
   ```solidity
   // In user_account_contract.go
   appAccount.IsAppInstalled(userAddress, botAppAddress)
   ```
5. If installed, USER → BOT DM is allowed

## Prerequisites for App Installation

### Level 1: AccountModules must be installed on user's account
- User's smart account must have AccountModules (AccountHubFacet + AppManagerFacet) installed
- This provides the `onInstallApp()`, `isAppInstalled()`, etc. functions
- Done via `installExecution()` on ERC-6900 accounts or diamond cut

### Level 2: App must be registered in AppRegistry
- `appId` (EAS attestation UID)
- `module` address (the app contract)
- `permissions` array
- `ExecutionManifest` (ERC6900 execution functions)
- `duration` (subscription period)

### Other Requirements
- **Sufficient payment** if app has install price

## Code Example: Complete Installation

```solidity
// 1. Get the app's ID from the registry (off-chain lookup or known)
bytes32 appId = appRegistry.getAppId(botModuleAddress);

// 2. Install the app on user's account
// Option A: Through AppInstaller (for spaces)
appInstaller.installApp{value: installPrice}(
    ITownsApp(botModuleAddress),
    IAppAccount(userAccount),
    "" // no init data
);

// Option B: Direct call (for user modular accounts)
IAppAccount(userAccount).onInstallApp(appId, "");

// 3. Verify installation
bool installed = IAppAccount(userAccount).isAppInstalled(botModuleAddress);
```

---

## How to Install AppManagerFacet in a Modular Account

Before users can install apps, their modular account needs the `AppManagerFacet` capabilities. There are two approaches:

### Approach 1: During Account Creation (Diamond Pattern)

When deploying a new account diamond, include AppManagerFacet in the initial diamond cut:

```solidity
// In deployment script (see DeployAccountModules.s.sol)
import {DeployAppManagerFacet} from "../facets/DeployAppManagerFacet.s.sol";

// Add facet to diamond initialization
facet = facetHelper.getDeployedAddress("AppManagerFacet");
addFacet(
    makeCut(facet, FacetCutAction.Add, DeployAppManagerFacet.selectors()),
    facet,
    DeployAppManagerFacet.makeInitData()  // Calls __AppManagerFacet_init()
);
```

**Registered Selectors** (11 functions):
- `onInstallApp`, `onUninstallApp`, `onRenewApp`, `onUpdateApp`
- `enableApp`, `disableApp`
- `isAppInstalled`, `getAppId`, `getAppExpiration`, `getInstalledApps`
- `isAppEntitled`

### Approach 2: Via ERC-6900 Module Installation (Runtime)

For existing ModularAccount instances, install the `AccountHubFacet` as an ERC-6900 execution module:

```solidity
// AccountHubFacet IS the ERC-6900 module that provides AppManager functions
AccountHubFacet accountHub = AccountHubFacet(hubAddress);

// Install the execution module on the user's ModularAccount
// This requires calling from within the account or via an authorized session
userAccount.installExecution(
    address(accountHub),                    // Module address
    accountHub.executionManifest(),         // Declares all app management functions
    abi.encode(address(userAccount))        // Init data (account address)
);
```

**What happens during installation:**
1. `AccountHubFacet.onInstall()` is called with the account address
2. The account is marked as "installed" in AccountHub storage
3. All 11 AppManager functions become callable on the account
4. The account can now call `onInstallApp()`, `isAppInstalled()`, etc.

### Test Example

From `test/account/AppManager.t.sol`:

```solidity
function _createAccountWithHubInstalled(address user) internal returns (address account) {
    // 1. Create a fresh ModularAccount
    ModularAccount userAccount = _createAccount(user, 0);

    // 2. Install AccountHub execution module (includes AppManager capabilities)
    _installExecution(
        userAccount,
        address(accountHub),
        accountHub.executionManifest(),
        abi.encode(address(userAccount))
    );

    return address(userAccount);
}
```

### Architecture Relationship

```
┌─────────────────────────────────────────────────────────────┐
│                    User's ModularAccount                     │
│                    (ERC-6900 Compatible)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                    installExecution()
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AccountHubFacet                           │
│         (ERC-6900 IExecutionModule implementation)           │
│                                                              │
│   executionManifest() returns:                               │
│   - onInstallApp, onUninstallApp, onRenewApp, onUpdateApp   │
│   - enableApp, disableApp                                    │
│   - isAppInstalled, getAppId, getAppExpiration, etc.        │
└─────────────────────────────────────────────────────────────┘
                              │
                         delegates to
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AppManagerMod (Library)                   │
│         (Diamond storage pattern for app tracking)           │
└─────────────────────────────────────────────────────────────┘
```

### Key Deployment Files

| File | Purpose |
|------|---------|
| `scripts/deployments/diamonds/DeployAccountModules.s.sol` | Full account diamond deployment |
| `scripts/deployments/facets/DeployAppManagerFacet.s.sol` | AppManagerFacet deployment with selectors |
| `src/account/facets/hub/AccountHubFacet.sol` | ERC-6900 module wrapping AppManager |
| `test/account/AppManager.t.sol` | Test examples showing installation |

---

## Related Files

- `packages/contracts/src/apps/facets/installer/AppInstallerFacet.sol`
- `packages/contracts/src/apps/facets/registry/AppRegistryBase.sol`
- `packages/contracts/src/account/facets/app/AppManagerFacet.sol`
- `packages/contracts/src/account/facets/app/AppManagerMod.sol`
- `packages/contracts/src/account/facets/hub/AccountHubFacet.sol`
- `packages/contracts/src/spaces/facets/account/IAppAccount.sol`
- `packages/contracts/src/spaces/facets/account/AppAccountBase.sol`
- `packages/contracts/scripts/deployments/diamonds/DeployAccountModules.s.sol`
- `packages/contracts/scripts/deployments/facets/DeployAppManagerFacet.s.sol`
- `core/node/auth/user_account_contract.go` (Go integration)
