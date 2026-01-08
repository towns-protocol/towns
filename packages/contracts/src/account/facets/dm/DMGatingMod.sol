// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {ICriteria} from "./ICriteria.sol";

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

library DMGatingMod {
    // types
    using CustomRevert for bytes4;
    using EnumerableSetLib for EnumerableSetLib.AddressSet;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ENUMS                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    enum CombinationMode {
        AND, // All criteria must pass
        OR // Any criteria can pass
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           ERRORS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Thrown when max criteria limit is reached
    error DMGating__MaxCriteriaReached();

    /// @notice Thrown when criteria is already installed
    error DMGating__CriteriaAlreadyInstalled();

    /// @notice Thrown when criteria is not installed
    error DMGating__CriteriaNotInstalled();

    /// @notice Thrown when criteria address is invalid
    error DMGating__InvalidCriteria();

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           EVENTS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    event CriteriaInstalled(address indexed account, address indexed criteria);
    event CriteriaUninstalled(
        address indexed account,
        address indexed criteria
    );
    event CombinationModeChanged(
        address indexed account,
        CombinationMode mode
    );

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         STORAGE                            */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // keccak256(abi.encode(uint256(keccak256("towns.account.dm.gating.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 constant STORAGE_SLOT =
        0x738f876e2a2e6d490330051e7611db72315baee9e3fef40f60abda772c241a00;

    uint8 constant MAX_CRITERIA = 8;

    /// @notice Storage layout for the DMGating module
    /// @custom:storage-location erc7201:towns.account.dm.gating.storage
    struct Layout {
        mapping(address account => EnumerableSetLib.AddressSet) criteria;
        mapping(address account => CombinationMode) combinationMode;
    }

    /// @notice Returns the storage layout for the DMGating module
    /// @return $ The storage layout
    function getStorage() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         FUNCTIONS                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @notice Install a criteria module for an account
    /// @param $ The storage layout
    /// @param account The account installing the criteria
    /// @param criteria The criteria contract address
    /// @param data Initialization data for the criteria
    function installCriteria(
        Layout storage $,
        address account,
        address criteria,
        bytes calldata data
    ) internal {
        if (criteria == address(0))
            DMGating__InvalidCriteria.selector.revertWith();

        EnumerableSetLib.AddressSet storage criteriaSet = $.criteria[account];

        if (criteriaSet.length() >= MAX_CRITERIA)
            DMGating__MaxCriteriaReached.selector.revertWith();

        if (criteriaSet.contains(criteria))
            DMGating__CriteriaAlreadyInstalled.selector.revertWith();

        criteriaSet.add(criteria);

        // Call onInstall on the criteria contract
        ICriteria(criteria).onInstall(account, data);

        emit CriteriaInstalled(account, criteria);
    }

    /// @notice Uninstall a criteria module from an account
    /// @param $ The storage layout
    /// @param account The account uninstalling the criteria
    /// @param criteria The criteria contract address
    function uninstallCriteria(
        Layout storage $,
        address account,
        address criteria
    ) internal {
        if (criteria == address(0))
            DMGating__InvalidCriteria.selector.revertWith();

        EnumerableSetLib.AddressSet storage criteriaSet = $.criteria[account];

        if (!criteriaSet.contains(criteria))
            DMGating__CriteriaNotInstalled.selector.revertWith();

        criteriaSet.remove(criteria);

        // Call onUninstall on the criteria contract (non-reverting)
        // solhint-disable-next-line no-empty-blocks
        try ICriteria(criteria).onUninstall(account) {} catch {}

        emit CriteriaUninstalled(account, criteria);
    }

    /// @notice Set the combination mode for an account
    /// @param $ The storage layout
    /// @param account The account setting the mode
    /// @param mode The combination mode (AND or OR)
    function setCombinationMode(
        Layout storage $,
        address account,
        CombinationMode mode
    ) internal {
        $.combinationMode[account] = mode;
        emit CombinationModeChanged(account, mode);
    }

    /// @notice Check if a sender can DM the recipient
    /// @param $ The storage layout
    /// @param account The recipient account
    /// @param sender The sender address
    /// @param extraData Additional context data
    /// @return True if sender can DM the recipient
    function canReceiveDMFrom(
        Layout storage $,
        address account,
        address sender,
        bytes calldata extraData
    ) internal view returns (bool) {
        address[] memory criteriaList = $.criteria[account].values();
        uint256 length = criteriaList.length;

        // No criteria = block all (default deny)
        if (length == 0) return false;

        CombinationMode mode = $.combinationMode[account];

        for (uint256 i; i < length; ++i) {
            bool result = ICriteria(criteriaList[i]).canDM(
                sender,
                account,
                extraData
            );

            // Early exit on success for OR mode
            if (mode == CombinationMode.OR && result) return true;
            // Early exit on failure for AND mode
            if (mode == CombinationMode.AND && !result) return false;
        }

        // OR mode: none passed -> false, AND mode: all passed -> true
        return mode == CombinationMode.AND;
    }

    /// @notice Get all installed criteria for an account
    /// @param $ The storage layout
    /// @param account The account to check
    /// @return Array of installed criteria addresses
    function getInstalledCriteria(
        Layout storage $,
        address account
    ) internal view returns (address[] memory) {
        return $.criteria[account].values();
    }

    /// @notice Check if a criteria is installed for an account
    /// @param $ The storage layout
    /// @param account The account to check
    /// @param criteria The criteria address
    /// @return True if the criteria is installed
    function isCriteriaInstalled(
        Layout storage $,
        address account,
        address criteria
    ) internal view returns (bool) {
        return $.criteria[account].contains(criteria);
    }

    /// @notice Get the combination mode for an account
    /// @param $ The storage layout
    /// @param account The account to check
    /// @return The combination mode
    function getCombinationMode(
        Layout storage $,
        address account
    ) internal view returns (CombinationMode) {
        return $.combinationMode[account];
    }
}
