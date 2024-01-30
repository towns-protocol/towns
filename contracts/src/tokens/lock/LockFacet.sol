// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {ILock} from "./ILock.sol";

// libraries

// contracts
import {LockBase} from "contracts/src/tokens/lock/LockBase.sol";
import {Facet} from "contracts/src/diamond/facets/Facet.sol";

abstract contract LockFacet is ILock, LockBase, Facet {
  function __LockFacet_init(uint256 cooldown) external onlyInitializing {
    __LockFacet_init_unchained(cooldown);
  }

  function __LockFacet_init_unchained(uint256 cooldown) internal {
    _addInterface(type(ILock).interfaceId);
    _setDefaultCooldown(cooldown);
  }

  /// @inheritdoc ILock
  function isLockEnabled(address account) external view virtual returns (bool) {
    return _lockEnabled(account);
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
