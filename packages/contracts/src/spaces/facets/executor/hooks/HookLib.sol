// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";

// types
import {HookConfig, Hook} from "./IHookBase.sol";

// contracts

library HookLib {
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;

    function isHookActive(HookConfig storage self, bytes32 hookId) internal view returns (bool) {
        return self.hookData[hookId].isActive;
    }

    function createHook(
        HookConfig storage self,
        bytes32 hookId,
        address module,
        uint32 entityId
    ) internal {
        self.hookData[hookId] = Hook({module: module, entityId: entityId, isActive: true});
    }

    function removeHook(HookConfig storage self, bytes32 hookId, bytes4 selector) internal {
        delete self.hookData[hookId];
        delete self.preHookData[selector][hookId];
        self.preHooks.remove(hookId);
        self.postHooks.remove(hookId);
    }
}
