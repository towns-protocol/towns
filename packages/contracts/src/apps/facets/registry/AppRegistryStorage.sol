// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

/**
 * @title AppRegistryStorage
 * @notice Storage library for the app registry system
 * @dev Uses a dedicated storage slot to ensure storage safety in the diamond pattern
 */
library AppRegistryStorage {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STRUCTS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /**
     * @notice Information about a registered app
     * @dev Tracks the app address, latest version, and ban status
     * @param app The app's contract address
     * @param latestVersion The UID of the latest version of the app
     * @param isBanned Whether the app has been banned
     */
    struct AppInfo {
        address app;
        bytes32 latestVersion;
        bool isBanned;
    }

    /**
     * @notice Storage layout for the app registry module
     * @dev Contains the schema ID and mapping of app addresses to their info
     * @param schemaId The current schema ID used for app attestations
     * @param apps Mapping from app address to app information
     */
    struct Layout {
        // Registered schema ID
        bytes32 schemaId;
        // App => AppInfo
        mapping(address => AppInfo) apps;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STORAGE                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // keccak256(abi.encode(uint256(keccak256("app.registry.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xe1abd3beb055e0136b3111c2c34ff6e869f8c0d7540225f8056528d6eb12b500;

    /// @notice Returns the storage layout for the module registry
    /// @return l The storage layout struct
    function getLayout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
