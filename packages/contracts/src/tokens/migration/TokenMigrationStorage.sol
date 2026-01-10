// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// libraries

// contracts

library TokenMigrationStorage {
    struct Layout {
        IERC20 oldToken;
        IERC20 newToken;
    }

    // keccak256(abi.encode(uint256(keccak256("token.migration.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 public constant STORAGE_SLOT =
        0x70042d58ab6ffbb7e110198cb4fbcbe6957a43f69f02f904ebed551d03013400;

    function layout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
