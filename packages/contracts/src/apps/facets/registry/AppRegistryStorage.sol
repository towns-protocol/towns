// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

struct AppInfo {
    address app;
    bytes32 latestVersion;
    bool isBanned;
}

struct ClientInfo {
    address app;
}

library AppRegistryStorage {
    struct Layout {
        // Registered schema ID
        bytes32 schemaId;
        // App => AppInfo
        mapping(address => AppInfo) apps;
        // Simple app beacon
        address beacon;
        // Space factory
        address spaceFactory;
        // client => ClientInfo
        mapping(address => ClientInfo) client;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           STORAGE                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // keccak256(abi.encode(uint256(keccak256("app.registry.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xe1abd3beb055e0136b3111c2c34ff6e869f8c0d7540225f8056528d6eb12b500;

    /// @notice Returns the storage layout for the module registry
    /// @return $ The storage layout struct
    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
