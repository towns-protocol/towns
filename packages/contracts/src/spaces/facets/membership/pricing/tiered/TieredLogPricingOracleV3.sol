// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IMembershipPricing} from "src/spaces/facets/membership/pricing/IMembershipPricing.sol";
import {AggregatorV3Interface} from "src/utils/interfaces/AggregatorV3Interface.sol";

// libraries
import {Casting, UD60x18, log10} from "@prb/math/UD60x18.sol";

// contracts
import {IntrospectionFacet} from "@towns-protocol/diamond/src/facets/introspection/IntrospectionFacet.sol";

/**
 * @title TieredLogPricingOracle
 * @notice Network: Base (Sepolia)
 */
contract TieredLogPricingOracleV3 is IMembershipPricing, IntrospectionFacet {
    AggregatorV3Interface internal dataFeed;

    uint256 internal constant SCALE = 1e18; // 1 ether
    uint256 internal constant CENT_SCALE = 100;
    uint256 internal constant LOG_BASE = 10 ** 16;
    uint256 internal constant FEED_TIMEOUT = 24 hours;

    // Cached values for optimization
    uint256 private immutable exchangeRateDecimals;
    uint256 private immutable exchangeRateScale;

    // Error messages
    error TieredLogPricingOracle__InvalidAnswer();
    error TieredLogPricingOracle__InvalidRound();
    error TieredLogPricingOracle__InvalidTimestamp();
    error TieredLogPricingOracle__StaleData();

    constructor(address priceFeed) {
        __IntrospectionBase_init();
        _addInterface(type(IMembershipPricing).interfaceId);
        dataFeed = AggregatorV3Interface(priceFeed);
        exchangeRateDecimals = 10 ** dataFeed.decimals();
        exchangeRateScale = exchangeRateDecimals * CENT_SCALE;
    }

    function name() public pure override returns (string memory) {
        return "TieredLogPricingOracleV3";
    }

    function description() public pure override returns (string memory) {
        return "Logarithmically increasing price";
    }

    function setPrice(uint256) external pure {
        revert("TieredLogPricingOracle: price is calculated logarithmically");
    }

    function getPrice(uint256 freeAllocation, uint256 totalMinted) public view returns (uint256) {
        uint256 stablePriceCents = _calculateStablePrice(freeAllocation, totalMinted);

        return _getWeiFromCents(stablePriceCents);
    }

    // =============================================================
    //                           Internal
    // =============================================================

    function getChainlinkDataFeedLatestAnswer() public view returns (uint256) {
        // prettier-ignore
        (
            uint80 roundId,
            int256 answer,
            /*uint startedAt*/
            ,
            uint256 updatedAt,
            /*uint80 answeredInRound*/
        ) = dataFeed.latestRoundData();

        if (answer <= 0) revert TieredLogPricingOracle__InvalidAnswer();
        if (roundId == 0) revert TieredLogPricingOracle__InvalidRound();
        if (updatedAt == 0) revert TieredLogPricingOracle__InvalidTimestamp();
        if (updatedAt > block.timestamp) {
            revert TieredLogPricingOracle__InvalidTimestamp();
        }
        if (block.timestamp - updatedAt > FEED_TIMEOUT) {
            revert TieredLogPricingOracle__StaleData();
        }

        return uint256(answer);
    }

    /// @notice Converts a price in cents to wei
    /// @param cents The price in cents to convert
    /// @return The price in wei
    function _getWeiFromCents(uint256 cents) internal view returns (uint256) {
        uint256 exchangeRate = getChainlinkDataFeedLatestAnswer(); // chainlink oracle returns this
        // value

        // oracle or governance
        // multiple before divide to avoid truncation which ends up in precision loss
        uint256 ethToUsdExchangeRateCents = (exchangeRate * 100) / exchangeRateDecimals;
        uint256 oneCentInWei = SCALE / ethToUsdExchangeRateCents;

        return oneCentInWei * cents;
    }

    function _calculateStablePrice(uint256, uint256 totalMinted) internal pure returns (uint256) {
        // Define minted tiers
        uint256 tier1 = 100;
        uint256 tier2 = 1000;
        uint256 tier3 = 10_000;

        // Define base prices in cents
        uint256 basePriceTier1 = 100; // $1.00
        uint256 basePriceTier2 = 1000; // $10.00
        uint256 basePriceTier3 = 10_000; // $100.00

        if (totalMinted <= tier1) {
            // Logarithmic scaling for tier 1
            uint256 logScale = _calculateLogScale(totalMinted == 0 ? 1 : totalMinted);
            return logScale / 2 + basePriceTier1; // Dividing by 2 is an arbitrary scaling factor
        } else if (totalMinted <= tier2) {
            // Logarithmic scaling for tier 2
            uint256 logScale = _calculateLogScale(totalMinted);
            return logScale * 3 + basePriceTier1;
        } else if (totalMinted <= tier3) {
            // Logarithmic scaling for tier 3
            uint256 logScale = _calculateLogScale(totalMinted);
            return logScale * 22 + basePriceTier2;
        } else {
            return basePriceTier3;
        }
    }

    function _calculateLogScale(uint256 value) private pure returns (uint256) {
        UD60x18 logResult = log10(Casting.ud(value * SCALE));
        return Casting.intoUint256(logResult) / LOG_BASE;
    }
}
