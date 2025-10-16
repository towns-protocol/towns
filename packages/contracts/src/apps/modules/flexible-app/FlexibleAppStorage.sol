// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces

// libraries

// contracts

library FlexibleAppStorage {
    // keccak256(abi.encode(uint256(keccak256("towns.flexible.app.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x3e09f2e5f1a0ed6503384169d9f2a2b92290013bbfd81c71aed2e3c692c02800;

    // Constant key for CoreConfig mapping
    bytes32 internal constant CORE_CONFIG_KEY = keccak256("core.config");

    struct CoreConfig {
        address owner;
        address client;
        bool useAllowList; // If true: only allowed targets, if false: allow all except blacklist
    }

    struct Metadata {
        string name;
        bytes32[] permissions;
        uint256 installPrice;
        uint48 accessDuration;
        bool exists; // Track if version registered
    }

    struct AccountContext {
        bytes32 currentAppId; // Which version this account uses
        bool isInstalled;
        uint48 installedAt;
        uint48 expiresAt;
        mapping(address => bool) authorizedCallers;
        bytes metadata; // Extensible for future
    }

    struct Layout {
        // Core config (upgradable via mapping with constant key)
        mapping(bytes32 configKey => CoreConfig) config;
        // Execution control - allow list
        mapping(address target => bool) allowedTargets;
        // Version metadata
        mapping(bytes32 appId => Metadata) appMetadata;
        bytes32 latestAppId;
        // Account installations
        mapping(address account => AccountContext) contexts;
        uint256 totalInstalled;
    }

    /// @notice Returns the storage layout for FlexibleApp
    /// @return $ The storage layout struct
    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    /// @notice Returns the core configuration
    /// @return core The CoreConfig struct
    function getCoreConfig() internal view returns (CoreConfig storage core) {
        return getLayout().config[CORE_CONFIG_KEY];
    }

    /// @notice Returns metadata for a specific app version
    /// @param appId The app version ID
    /// @return metadata The Metadata struct
    function getMetadata(bytes32 appId) internal view returns (Metadata storage metadata) {
        return getLayout().appMetadata[appId];
    }

    /// @notice Returns the account context for a specific account
    /// @param account The account address
    /// @return context The AccountContext struct
    function getContext(address account) internal view returns (AccountContext storage context) {
        return getLayout().contexts[account];
    }

    /// @notice Checks if an account has installed the app
    /// @param account The account address
    /// @return installed True if installed, false otherwise
    function isInstalled(address account) internal view returns (bool) {
        return getLayout().contexts[account].isInstalled;
    }

    /// @notice Returns the app version an account is currently using
    /// @param account The account address
    /// @return appId The current app version ID
    function getAccountVersion(address account) internal view returns (bytes32) {
        return getLayout().contexts[account].currentAppId;
    }

    /// @notice Checks if a target contract is in the allow list
    /// @param target The target contract address
    /// @return allowed True if allowed, false otherwise
    function isTargetAllowed(address target) internal view returns (bool) {
        return getLayout().allowedTargets[target];
    }
}
