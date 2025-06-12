// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// Internal libraries
import {SpendingLimits} from "./ITransferControl.sol";

library TransferControlStorage {
    // keccak256(abi.encode(uint256(keccak256("spaces.facets.account.transfercontrol.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xd7affc4eb57929463883bdf445e7a9e74073e0cb099a7adfeee3b43d8669ee00;

    struct Layout {
        mapping(address app => mapping(address token => SpendingLimits)) limitsByApp;
        mapping(address token => SpendingLimits) limitsByToken;
        mapping(address token => bool) allowedTokens;
        // Global settings
        bool transferControlEnabled;
        address[] monitoredTokens;
    }

    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
