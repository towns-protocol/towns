// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

//interfaces
import {IRiverBase} from "contracts/src/tokens/river/mainnet/IRiver.sol";

//libraries

//contracts
import {Deployer} from "../common/Deployer.s.sol";
import {River} from "contracts/src/tokens/river/mainnet/River.sol";

contract DeployRiverMainnet is Deployer, IRiverBase {
  address public constant association =
    address(0x6C373dB26926a0575f70369aAE2cBfC0E88218DC);
  address public constant vault =
    address(0xD6ab6aA22D7cD09e18A923192a20F9c82331d1CB);

  address internal river;

  RiverConfig public config =
    RiverConfig({
      /// @dev owner of the tokens
      vault: vault,
      /// @dev owner of the contract
      owner: association,
      inflationConfig: InflationConfig({
        /// @dev initialInflationRate is the initial inflation rate in basis points (0-10000)
        initialInflationRate: 800,
        /// @dev finalInflationRate is the final inflation rate in basis points (0-10000)
        finalInflationRate: 200,
        /// @dev inflationDecreaseRate is the rate at which the inflation rate decreases in basis points (0-10000)
        inflationDecreaseRate: 600,
        /// @dev inflationDecreaseInterval is the interval at which the inflation rate decreases in years
        inflationDecreaseInterval: 20
      })
    });

  function versionName() public pure override returns (string memory) {
    return "riverMainnet";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.broadcast(deployer);
    return address(new River(config));
  }
}
