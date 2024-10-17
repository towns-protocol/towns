// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ILockBase} from "./ILock.sol";

// libraries
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {LockStorage} from "./LockStorage.sol";

abstract contract LockBase is ILockBase {
  function __LockBase_init(uint256 cooldown) internal {
    _setDefaultCooldown(cooldown);
  }

  modifier onlyAllowed() {
    if (!_canLock()) CustomRevert.revertWith(LockNotAuthorized.selector);
    _;
  }

  function _setDefaultCooldown(uint256 cooldown) internal {
    LockStorage.layout().defaultCooldown = cooldown;
  }

  function _enableLock(address caller) internal {
    LockStorage.Layout storage ds = LockStorage.layout();

    ds.enabledByAddress[caller] = true;

    emit LockUpdated(caller, true, 0);
  }

  function _disableLock(address caller) internal {
    LockStorage.Layout storage ds = LockStorage.layout();

    uint256 cooldown = block.timestamp + ds.defaultCooldown;
    ds.enabledByAddress[caller] = false;
    ds.cooldownByAddress[caller] = cooldown;

    emit LockUpdated(caller, false, cooldown);
  }

  function _lockCooldown(address caller) internal view returns (uint256) {
    return LockStorage.layout().cooldownByAddress[caller];
  }

  function _lockEnabled(address caller) internal view returns (bool) {
    LockStorage.Layout storage ds = LockStorage.layout();

    if (ds.enabledByAddress[caller]) return true;

    return block.timestamp < ds.cooldownByAddress[caller];
  }

  function _canLock() internal view virtual returns (bool);
}
