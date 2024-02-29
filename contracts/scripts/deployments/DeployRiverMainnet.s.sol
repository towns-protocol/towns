// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces

//libraries

//contracts
import {Deployer} from "../common/Deployer.s.sol";
import {River} from "contracts/src/tokens/river/mainnet/River.sol";

contract DeployRiverMainnet is Deployer {
  address public vault;
  address internal river;
  address public association;

  function versionName() public pure override returns (string memory) {
    return "river";
  }

  function __deploy(
    uint256 deployerPK,
    address
  ) public override returns (address) {
    association = address(1);
    vault = address(2);

    vm.broadcast(deployerPK);
    return address(new River({vault: vault, owner: association}));
  }
}
