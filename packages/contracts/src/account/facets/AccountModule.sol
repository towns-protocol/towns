// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
/*                         EVENTS                           */
/*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

/// @notice Emitted when the space factory is set
/// @param spaceFactory The address of the space factory
event SpaceFactorySet(address spaceFactory);

/// @notice Emitted when the app registry is set
/// @param appRegistry The address of the app registry
event AppRegistrySet(address appRegistry);

/// @notice Emitted when the account is installed
/// @param account The address of the account
event Installed(address account);

/*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
/*                           ERRORS                           */
/*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

/// @notice Emitted when the sender is invalid
/// @param sender The address of the sender
error AccountModule__InvalidSender(address sender);

/// @notice Emitted when the account is already initialized
/// @param account The address of the account
error AccountModule__AlreadyInitialized(address account);

/// @notice Emitted when the account is invalid
/// @param account The address of the account
error AccountModule__InvalidAccount(address account);

/*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
/*                         STORAGE                            */
/*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

// keccak256(abi.encode(uint256(keccak256("towns.account.modules.storage")) - 1)) & ~bytes32(uint256(0xff))
bytes32 constant STORAGE_SLOT = 0x6f1ea9b463f1b71d7152d8267a9cec8292deeeb23f844482db8129707aea3800;

/// @notice Storage layout for the AccountModulesFacet
struct Layout {
    /// @notice Space factory
    address spaceFactory;
    /// @notice App registry
    address appRegistry;
    /// @notice Installed accounts
    mapping(address account => bool installed) installed;
}

/// @notice Returns the storage layout for the AccountModulesFacet
function getLayout() pure returns (Layout storage $) {
    assembly {
        $.slot := STORAGE_SLOT
    }
}

/*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
/*                         FUNCTIONS                          */
/*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

/// @notice Sets the space factory
/// @param spaceFactory The address of the space factory
function setSpaceFactory(address spaceFactory) {
    getLayout().spaceFactory = spaceFactory;
    emit SpaceFactorySet(spaceFactory);
}

/// @notice Sets the app registry
/// @param appRegistry The address of the app registry
function setAppRegistry(address appRegistry) {
    getLayout().appRegistry = appRegistry;
    emit AppRegistrySet(appRegistry);
}
