// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ILockBase} from "./ILock.sol";

// libraries
import {LockStorage} from "./LockStorage.sol";

abstract contract LockBase is ILockBase {
  function __LockBase_init(uint256 cooldown) internal {
    _setDefaultCooldown(cooldown);
  }

  modifier onlyAllowed() {
    if (!_canLock()) revert LockNotAuthorized();
    _;
  }

  function _setDefaultCooldown(uint256 cooldown) internal {
    LockStorage.layout().defaultCooldown = cooldown;
  }

  function _enableLock(address caller) internal {
    LockStorage.Layout storage ds = LockStorage.layout();

    if (ds.enabledByAddress[caller]) {
      revert LockAlreadyEnabled();
    }

    ds.enabledByAddress[caller] = true;

    emit LockUpdated(caller, true, 0, block.timestamp);
  }

  function _disableLock(address caller) internal {
    LockStorage.Layout storage ds = LockStorage.layout();

    if (ds.enabledByAddress[caller] == false) {
      revert LockAlreadyDisabled();
    }

    ds.enabledByAddress[caller] = false;
    ds.cooldownByAddress[caller] = block.timestamp + ds.defaultCooldown;

    emit LockUpdated(
      caller,
      false,
      block.timestamp + ds.defaultCooldown,
      block.timestamp
    );
  }

  function _lockCooldown(address caller) internal view returns (uint256) {
    return LockStorage.layout().cooldownByAddress[caller];
  }

  function _lockEnabled(address caller) internal view returns (bool) {
    LockStorage.Layout storage ds = LockStorage.layout();

    return
      ds.enabledByAddress[caller] == true ||
      block.timestamp < ds.cooldownByAddress[caller];
  }

  function _canLock() internal view virtual returns (bool);
}
