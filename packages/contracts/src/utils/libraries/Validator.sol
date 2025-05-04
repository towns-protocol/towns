// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {CustomRevert} from "./CustomRevert.sol";

library Validator {
    using CustomRevert for bytes4;

    error InvalidLength();
    error InvalidAddress();

    function checkLength(string memory name, uint256 min) internal pure {
        if (bytes(name).length < min) InvalidLength.selector.revertWith();
    }

    function checkLengthCalldata(string calldata name, uint256 min) internal pure {
        if (bytes(name).length < min) InvalidLength.selector.revertWith();
    }

    function checkLength(bytes memory name) internal pure {
        if (name.length == 0) InvalidLength.selector.revertWith();
    }

    function checkLengthCalldata(bytes calldata name) internal pure {
        if (name.length == 0) InvalidLength.selector.revertWith();
    }

    function checkAddress(address addr) internal pure {
        if (addr == address(0)) InvalidAddress.selector.revertWith();
    }
}
