// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ILock} from "./ILock.sol";

// libraries

// contracts
import {LockBase} from "contracts/src/tokens/lock/LockBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

abstract contract LockFacet is ILock, LockBase, Facet {
  function __LockFacet_init(uint256 cooldown) external onlyInitializing {
    __LockBase_init(cooldown);
    _addInterface(type(ILock).interfaceId);
  }

  /// @inheritdoc ILock
  function isLockEnabled(address account) external view virtual returns (bool) {
    return _lockEnabled(account);
  }

  function lockCooldown(
    address account
  ) external view virtual returns (uint256) {
    return _lockCooldown(account);
  }

  /// @inheritdoc ILock
  function enableLock(address account) external virtual onlyAllowed {
    _enableLock(account);
  }

  /// @inheritdoc ILock
  function disableLock(address account) external virtual onlyAllowed {
    _disableLock(account);
  }

  /// @inheritdoc ILock
  function setLockCooldown(uint256 cooldown) external virtual onlyAllowed {
    _setDefaultCooldown(cooldown);
  }
}
