// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

//interfaces
import {IMembershipPricing} from "contracts/src/spaces/facets/membership/pricing/IMembershipPricing.sol";

//libraries

//contracts
import {MockAggregatorV3} from "contracts/test/mocks/MockAggregatorV3.sol";
import {TieredLogPricingOracle} from "contracts/src/spaces/facets/membership/pricing/tiered/TieredLogPricingOracle.sol";

contract TieredLogPricingTest is TestUtils {
  int256 public constant EXCHANGE_RATE = 222616000000;

  function test_pricingModule() external {
    MockAggregatorV3 oracle = _setupOracle();
    IMembershipPricing pricingModule = IMembershipPricing(
      address(new TieredLogPricingOracle(address(oracle)))
    );

    // tier 0 < 1000
    uint256 price0 = pricingModule.getPrice({
      freeAllocation: 0,
      totalMinted: 0
    });
    assertEq(_getCentsFromWei(price0), 100); // $1 USD

    uint256 price1 = pricingModule.getPrice({
      freeAllocation: 0,
      totalMinted: 2
    });
    assertEq(_getCentsFromWei(price1), 115); // $1.15 USD

    // tier 1 > 1000
    uint256 price1000 = pricingModule.getPrice({
      freeAllocation: 0,
      totalMinted: 1000
    });
    assertEq(_getCentsFromWei(price1000), 985); // $9.85 USD

    // tier 2 > 10000
    uint256 price10000 = pricingModule.getPrice({
      freeAllocation: 0,
      totalMinted: 10000
    });
    assertEq(_getCentsFromWei(price10000), 9690); // $96.90 USD
  }

  // =============================================================
  //                           Helpers
  // =============================================================
  function _getCentsFromWei(uint256 weiAmount) private pure returns (uint256) {
    uint256 exchangeRate = uint256(EXCHANGE_RATE); // chainlink oracle returns this value
    uint256 exchangeRateDecimals = 10 ** 8; // chainlink oracle returns this value

    uint256 ethToUsdExchangeRateCents = (exchangeRate * 100) /
      exchangeRateDecimals;
    uint256 weiPerCent = 1e18 / ethToUsdExchangeRateCents;

    return weiAmount / weiPerCent;
  }

  function _setupOracle() internal returns (MockAggregatorV3 oracle) {
    oracle = new MockAggregatorV3({
      _decimals: 8,
      _description: "ETH/USD",
      _version: 1
    });
    oracle.setRoundData({
      _roundId: 1,
      _answer: EXCHANGE_RATE,
      _startedAt: 0,
      _updatedAt: 0,
      _answeredInRound: 0
    });
  }
}
