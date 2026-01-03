// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {IFeeManager} from "../../factory/facets/fee/IFeeManager.sol";
import {CurrencyTransfer} from "../../utils/libraries/CurrencyTransfer.sol";

library ProtocolFeeLib {
    using SafeTransferLib for address;

    /// @notice Charges protocol fee via FeeManager with ERC20 approval handling
    /// @param spaceFactory The FeeManager address
    /// @param feeType The type of fee being charged
    /// @param user The user paying the fee
    /// @param currency The payment currency (NATIVE_TOKEN or ERC20)
    /// @param amount The base amount for fee calculation
    /// @param expectedFee The pre-calculated expected fee
    /// @return protocolFee The actual fee charged
    function charge(
        address spaceFactory,
        bytes32 feeType,
        address user,
        address currency,
        uint256 amount,
        uint256 expectedFee
    ) internal returns (uint256 protocolFee) {
        if (expectedFee == 0) return 0;

        bool isNative = currency == CurrencyTransfer.NATIVE_TOKEN;
        if (!isNative) currency.safeApproveWithRetry(spaceFactory, expectedFee);

        protocolFee = IFeeManager(spaceFactory).chargeFee{value: isNative ? expectedFee : 0}(
            feeType,
            user,
            amount,
            currency,
            expectedFee,
            ""
        );

        if (!isNative) currency.safeApprove(spaceFactory, 0);
    }
}
