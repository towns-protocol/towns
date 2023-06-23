// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

//interfaces
import {IDiamond} from "contracts/src/diamond/IDiamond.sol";

//libraries

//contracts
import {TestUtils} from "../utils/TestUtils.sol";
import {MockDiamond} from "../mocks/MockDiamond.sol";

contract DiamondBaseSetup is TestUtils {
  address internal diamond;
  address internal deployer;

  constructor() {
    deployer = _randomAddress();

    vm.startPrank(deployer);
    diamond = address(new MockDiamond());
  }
}
