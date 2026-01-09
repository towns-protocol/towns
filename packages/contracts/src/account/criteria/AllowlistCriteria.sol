// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {ICriteria} from "src/account/facets/dm/ICriteria.sol";

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

/// @title AllowlistCriteria
/// @notice A criteria module that allows DMs from addresses on an allowlist
/// @dev Per-account allowlist stored in this contract. Only the DMGating module
///      can call onInstall/onUninstall to prevent unauthorized modifications.
contract AllowlistCriteria is ICriteria {
    using CustomRevert for bytes4;
    using EnumerableSetLib for EnumerableSetLib.AddressSet;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    error AllowlistCriteria__Unauthorized();
    error AllowlistCriteria__InvalidAddress();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event AddressAdded(address indexed account, address indexed addr);
    event AddressRemoved(address indexed account, address indexed addr);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         STORAGE                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice The authorized DMGating module that can call onInstall/onUninstall
    address public immutable dmGating;

    /// @notice Mapping from account to their allowlist
    mapping(address account => EnumerableSetLib.AddressSet) private _allowlists;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        CONSTRUCTOR                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Initialize with the authorized DMGating module address
    /// @param _dmGating The address of the DMGating facet/module
    constructor(address _dmGating) {
        dmGating = _dmGating;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         MODIFIERS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Restricts access to only the authorized DMGating module
    modifier onlyDMGating() {
        if (msg.sender != dmGating)
            AllowlistCriteria__Unauthorized.selector.revertWith();
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     ICriteria IMPLEMENTATION               */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc ICriteria
    function canDM(
        address sender,
        address recipient,
        bytes calldata /* extraData */
    ) external view override returns (bool) {
        return _allowlists[recipient].contains(sender);
    }

    /// @inheritdoc ICriteria
    function name() external pure override returns (string memory) {
        return "AllowlistCriteria";
    }

    /// @inheritdoc ICriteria
    /// @dev Only callable by the authorized DMGating module
    function onInstall(
        address account,
        bytes calldata data
    ) external override onlyDMGating {
        // Optionally initialize with addresses from data
        if (data.length > 0) {
            address[] memory addresses = abi.decode(data, (address[]));
            _addAddresses(account, addresses);
        }
    }

    /// @inheritdoc ICriteria
    /// @dev Only callable by the authorized DMGating module
    function onUninstall(address account) external override onlyDMGating {
        // Clear the allowlist for this account
        EnumerableSetLib.AddressSet storage allowlist = _allowlists[account];
        address[] memory addresses = allowlist.values();
        for (uint256 i; i < addresses.length; ++i) {
            allowlist.remove(addresses[i]);
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    PUBLIC FUNCTIONS                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Add addresses to the caller's allowlist
    /// @param addresses Array of addresses to add
    function addToAllowlist(address[] calldata addresses) external {
        _addAddresses(msg.sender, addresses);
    }

    /// @notice Remove addresses from the caller's allowlist
    /// @param addresses Array of addresses to remove
    function removeFromAllowlist(address[] calldata addresses) external {
        EnumerableSetLib.AddressSet storage allowlist = _allowlists[msg.sender];
        for (uint256 i; i < addresses.length; ++i) {
            address addr = addresses[i];
            if (allowlist.remove(addr)) {
                emit AddressRemoved(msg.sender, addr);
            }
        }
    }

    /// @notice Get the caller's allowlist
    /// @return Array of addresses in the allowlist
    function getAllowlist() external view returns (address[] memory) {
        return _allowlists[msg.sender].values();
    }

    /// @notice Get the allowlist for a specific account
    /// @param account The account to query
    /// @return Array of addresses in the account's allowlist
    function getAllowlistFor(
        address account
    ) external view returns (address[] memory) {
        return _allowlists[account].values();
    }

    /// @notice Check if an address is in the caller's allowlist
    /// @param addr The address to check
    /// @return True if the address is in the allowlist
    function isAllowed(address addr) external view returns (bool) {
        return _allowlists[msg.sender].contains(addr);
    }

    /// @notice Check if an address is in a specific account's allowlist
    /// @param account The account to query
    /// @param addr The address to check
    /// @return True if the address is in the account's allowlist
    function isAllowedFor(
        address account,
        address addr
    ) external view returns (bool) {
        return _allowlists[account].contains(addr);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    INTERNAL FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _addAddresses(
        address account,
        address[] memory addresses
    ) internal {
        EnumerableSetLib.AddressSet storage allowlist = _allowlists[account];
        for (uint256 i; i < addresses.length; ++i) {
            address addr = addresses[i];
            if (addr == address(0))
                AllowlistCriteria__InvalidAddress.selector.revertWith();
            if (allowlist.add(addr)) {
                emit AddressAdded(account, addr);
            }
        }
    }
}
