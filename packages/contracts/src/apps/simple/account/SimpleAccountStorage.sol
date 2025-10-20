// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

// interfaces
import {IEntryPoint} from "@eth-infinitism/account-abstraction/interfaces/IEntryPoint.sol";

// libraries

// contracts

library SimpleAccountStorage {
    // keccak256(abi.encode(uint256(keccak256("simple.account.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x50b1c084b04d93141a198030532d2108cf8654a43d025af0de681aa06dac5f00;

    struct Layout {
        address entryPoint;
        address coordinator;
    }

    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
