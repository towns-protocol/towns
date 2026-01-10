// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IFeeManager} from "src/factory/facets/fee/IFeeManager.sol";
import {FeeCalculationMethod, FeeConfig} from "src/factory/facets/fee/FeeManagerStorage.sol";

/// @title MockFeeManager
/// @notice A mock FeeManager for testing fee charging
contract MockFeeManager is IFeeManager {
    uint256 public lastFeeCharged;
    bytes32 public lastFeeType;
    address public lastUser;
    bytes public lastExtraData;
    bool public chargeFeeCalled;

    function chargeFee(
        bytes32 feeType,
        address user,
        uint256,
        address,
        uint256,
        bytes calldata extraData
    ) external payable returns (uint256 finalFee) {
        chargeFeeCalled = true;
        lastFeeType = feeType;
        lastUser = user;
        lastExtraData = extraData;
        lastFeeCharged = 0; // Free for testing
        return 0;
    }

    function calculateFee(
        bytes32,
        address,
        uint256,
        bytes calldata
    ) external pure returns (uint256) {
        return 5_000_000; // $5.00
    }

    function setFeeConfig(bytes32, address, FeeCalculationMethod, uint16, uint128, bool) external {}
    function setFeeHook(bytes32, address) external {}
    function setProtocolFeeRecipient(address) external {}

    function getFeeConfig(bytes32) external pure returns (FeeConfig memory) {
        return FeeConfig(address(0), 0, 0, FeeCalculationMethod.FIXED, false, 0, address(0));
    }

    function getFeeHook(bytes32) external pure returns (address) {
        return address(0);
    }

    function getProtocolFeeRecipient() external pure returns (address) {
        return address(0);
    }

    function __FeeManagerFacet__init(address) external {}
}
