// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Deployer} from "../common/Deployer.s.sol";
import {TieredLogPricingOracle} from "contracts/src/spaces/facets/membership/pricing/tiered/TieredLogPricingOracle.sol";
import {MockAggregatorV3} from "contracts/test/mocks/MockAggregatorV3.sol";

contract DeployTieredLogPricing is Deployer {
  int256 public constant EXCHANGE_RATE = 222616000000;

  function versionName() public pure override returns (string memory) {
    return "tieredLogPricing";
  }

  function __deploy(address deployer) public override returns (address) {
    address oracle = isAnvil()
      ? _setupLocalOracle(deployer)
      : _getOracleAddress();

    vm.broadcast(deployer);
    return address(new TieredLogPricingOracle(oracle));
  }

  function _getOracleAddress() internal view returns (address) {
    if (block.chainid == 8453) {
      // Base
      return 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70;
    } else if (block.chainid == 84532) {
      // Base (Sepolia)
      return 0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1;
    } else {
      revert("DeployTieredLogPricing: Invalid network");
    }
  }

  function _setupLocalOracle(address deployer) internal returns (address) {
    vm.startBroadcast(deployer);
    MockAggregatorV3 oracle = new MockAggregatorV3({
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
    vm.stopBroadcast();

    return address(oracle);
  }
}
