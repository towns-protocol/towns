// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ILock} from "./ILock.sol";

// libraries

// contracts

import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {LockBase} from "src/tokens/lock/LockBase.sol";

abstract contract LockFacet is ILock, LockBase, Facet {
    function __LockFacet_init(uint256 cooldown) external onlyInitializing {
        __LockBase_init(cooldown);
        _addInterface(type(ILock).interfaceId);
    }

    /// @inheritdoc ILock
    function isLockActive(address account) external view virtual returns (bool) {
        return _isLockActive(account);
    }

    /// @inheritdoc ILock
    function lockExpiration(address account) external view virtual returns (uint256) {
        return _lockExpiration(account);
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
