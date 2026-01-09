// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IModularAccount} from "@erc6900/reference-implementation/interfaces/IModularAccount.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/// @title MockSmartAccount
/// @notice A mock contract that supports IModularAccount interface for testing
contract MockSmartAccount {
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IModularAccount).interfaceId || interfaceId == type(IERC165).interfaceId;
    }
}
