// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// libraries
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";
import {Validator} from "../../../utils/libraries/Validator.sol";

library AccountHubMod {
    // types
    using CustomRevert for bytes4;

    /// @notice Storage layout for the AccountHubMod
    /// @custom:storage-location erc7201:towns.account.hub.storage
    struct Layout {
        /// @notice Space factory
        address spaceFactory;
        /// @notice App registry
        address appRegistry;
        /// @notice Installed accounts
        mapping(address account => bool installed) installed;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         STORAGE                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // keccak256(abi.encode(uint256(keccak256("towns.account.hub.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 constant STORAGE_SLOT =
        0x71d4dc86d61a3ac91d71fb32ada3a4c5ccb69a82d3979318701e6840c1db0a00;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Emitted when the space factory is set
    /// @param spaceFactory The address of the space factory
    event SpaceFactorySet(address spaceFactory);

    /// @notice Emitted when the app registry is set
    /// @param appRegistry The address of the app registry
    event AppRegistrySet(address appRegistry);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Reverted when the sender is invalid
    /// @param sender The address of the sender
    error AccountHub__InvalidSender(address sender);

    /// @notice Reverted when the account is already initialized
    /// @param account The address of the account
    error AccountHub__AlreadyInitialized(address account);

    /// @notice Reverted when the account is invalid
    /// @param account The address of the account
    error AccountHub__InvalidAccount(address account);

    /// @notice Reverted when the account is not installed
    /// @param account The address of the account
    error AccountHub__NotInstalled(address account);

    /// @notice Reverted when the sender is not the registry
    /// @param sender The address of the sender
    error AccountHub__InvalidCaller(address sender);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Installs an account
    /// @param account The address of the account
    function installAccount(Layout storage $, address account) internal {
        Validator.checkAddress(account);
        if (account != msg.sender) AccountHub__InvalidAccount.selector.revertWith(account);

        if ($.installed[account]) AccountHub__AlreadyInitialized.selector.revertWith(account);
        $.installed[account] = true;
    }

    /// @notice Uninstalls an account
    /// @param account The address of the account
    function uninstallAccount(Layout storage $, address account) internal {
        Validator.checkAddress(account);
        if (account != msg.sender) AccountHub__InvalidAccount.selector.revertWith(account);
        if (!$.installed[account]) AccountHub__NotInstalled.selector.revertWith(account);
        delete $.installed[account];
    }

    /// @notice Sets the space factory
    /// @param spaceFactory The address of the space factory
    function setSpaceFactory(Layout storage $, address spaceFactory) internal {
        Validator.checkAddress(spaceFactory);
        $.spaceFactory = spaceFactory;
        emit SpaceFactorySet(spaceFactory);
    }

    /// @notice Sets the app registry
    /// @param appRegistry The address of the app registry
    function setAppRegistry(Layout storage $, address appRegistry) internal {
        Validator.checkAddress(appRegistry);
        $.appRegistry = appRegistry;
        emit AppRegistrySet(appRegistry);
    }

    /// @notice Checks if an account is installed
    /// @param account The address of the account
    /// @return True if the account is installed, false otherwise
    function isInstalled(Layout storage $, address account) internal view returns (bool) {
        return $.installed[account];
    }

    /// @notice Gets the space factory
    /// @return spaceFactory The address of the space factory
    function getSpaceFactory(Layout storage $) internal view returns (address) {
        return $.spaceFactory;
    }

    /// @notice Gets the app registry
    /// @return appRegistry The address of the app registry
    function getAppRegistry(Layout storage $) internal view returns (address) {
        return $.appRegistry;
    }

    /// @notice Checks if the caller is the registry
    /// @dev Guard function: reverts if the caller is not the registry
    function onlyRegistry(Layout storage $, address caller) internal view {
        if (caller != $.appRegistry) AccountHub__InvalidCaller.selector.revertWith(caller);
    }

    /// @notice Returns the storage layout for the AccountHubMod
    function getStorage() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
