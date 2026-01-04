// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";

// interfaces
import {IMembershipPricing} from "src/spaces/facets/membership/pricing/IMembershipPricing.sol";

// libraries

// contracts

import {TieredLogPricingOracleV3} from "src/spaces/facets/membership/pricing/tiered/TieredLogPricingOracleV3.sol";
import {MockAggregatorV3} from "test/mocks/MockAggregatorV3.sol";

contract TieredLogPricingTest is TestUtils {
    int256 public constant EXCHANGE_RATE = 222_616_000_000;

    function test_pricingModule() external {
        MockAggregatorV3 oracle = _setupOracle();
        IMembershipPricing pricingModule = IMembershipPricing(
            address(new TieredLogPricingOracleV3(address(oracle)))
        );

        // tier 0 -> 100
        uint256 price0 = pricingModule.getPrice({freeAllocation: 0, totalMinted: 0});
        assertEq(_getCentsFromWei(price0), 100); // $1 USD

        uint256 price100 = pricingModule.getPrice({freeAllocation: 0, totalMinted: 100});
        assertEq(_getCentsFromWei(price100), 200); // $2.00 USD

        // tier 101 -> 1000
        uint256 price101 = pricingModule.getPrice({freeAllocation: 0, totalMinted: 101});
        assertEq(_getCentsFromWei(price101), 700); // $7.00 USD

        uint256 price1000 = pricingModule.getPrice({freeAllocation: 0, totalMinted: 1000});
        assertEq(_getCentsFromWei(price1000), 1000); // $10.00 USD

        // tier 1001 -> 10000
        uint256 price1001 = pricingModule.getPrice({freeAllocation: 0, totalMinted: 1001});
        assertEq(_getCentsFromWei(price1001), 7600); // $76.00 USD

        uint256 price10000 = pricingModule.getPrice({freeAllocation: 0, totalMinted: 10_000});
        assertEq(_getCentsFromWei(price10000), 9800); // $98.00 USD

        // tier 10_000+
        uint256 price10001 = pricingModule.getPrice({freeAllocation: 0, totalMinted: 10_001});
        assertEq(_getCentsFromWei(price10001), 10_000); // $100.00 USD
    }

    function test_pricingModuleMonotonicIncrease() external {
        MockAggregatorV3 oracle = _setupOracle();
        IMembershipPricing pricingModule = IMembershipPricing(
            address(new TieredLogPricingOracleV3(address(oracle)))
        );

        uint256 lastPrice = 0;
        for (uint256 i = 0; i <= 15_000; i++) {
            uint256 price = pricingModule.getPrice({freeAllocation: 0, totalMinted: i});
            assertGe(price, lastPrice, "Price should be increasing");
            lastPrice = price;
        }
    }

    // =============================================================
    //                           Helpers
    // =============================================================
    function _getCentsFromWei(uint256 weiAmount) private pure returns (uint256) {
        uint256 exchangeRate = uint256(EXCHANGE_RATE); // chainlink oracle returns this value
        uint256 exchangeRateDecimals = 10 ** 8; // chainlink oracle returns this value

        uint256 ethToUsdExchangeRateCents = (exchangeRate * 100) / exchangeRateDecimals;
        uint256 weiPerCent = 1e18 / ethToUsdExchangeRateCents;

        return weiAmount / weiPerCent;
    }

    function _setupOracle() internal returns (MockAggregatorV3 oracle) {
        oracle = new MockAggregatorV3({_decimals: 8, _description: "ETH/USD", _version: 1});
        oracle.setRoundData({
            _roundId: 1,
            _answer: EXCHANGE_RATE,
            _startedAt: 0,
            _updatedAt: block.timestamp,
            _answeredInRound: 0
        });
    }
}
