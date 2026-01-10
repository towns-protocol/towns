// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ILockBase} from "./ILock.sol";

// libraries

import {LockStorage} from "./LockStorage.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

abstract contract LockBase is ILockBase {
    modifier onlyAllowed() {
        if (!_canLock()) CustomRevert.revertWith(LockNotAuthorized.selector);
        _;
    }

    function __LockBase_init(uint256 cooldown) internal {
        _setDefaultCooldown(cooldown);
    }

    /// @dev Sets the default cooldown for the lock.
    function _setDefaultCooldown(uint256 cooldown) internal {
        LockStorage.layout().defaultCooldown = cooldown;
    }

    /// @dev Enables the lock for the given account.
    function _enableLock(address account) internal {
        LockStorage.Layout storage ds = LockStorage.layout();

        ds.enabledByAddress[account] = true;
        ds.expirationByAddress[account] = 0;

        emit LockUpdated(account, true, 0);
    }

    /// @dev Disables the lock and starts the cooldown for the given account.
    function _disableLock(address account) internal {
        LockStorage.Layout storage ds = LockStorage.layout();

        uint256 expiration = block.timestamp + ds.defaultCooldown;
        ds.enabledByAddress[account] = false;
        ds.expirationByAddress[account] = expiration;

        emit LockUpdated(account, false, expiration);
    }

    /// @dev Returns the lock expiration for the given account.
    function _lockExpiration(address account) internal view returns (uint256) {
        return LockStorage.layout().expirationByAddress[account];
    }

    /// @dev Returns whether the lock is active for the given account.
    function _isLockActive(address account) internal view returns (bool) {
        LockStorage.Layout storage ds = LockStorage.layout();

        if (ds.enabledByAddress[account]) return true;

        return block.timestamp < ds.expirationByAddress[account];
    }

    /// @dev Returns whether the caller is authorized to lock.
    function _canLock() internal view virtual returns (bool);
}
