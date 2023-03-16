// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {ScriptUtils} from "contracts/scripts/utils/ScriptUtils.sol";

import {TownOwner} from "contracts/src/core/tokens/TownOwner.sol";
import {SpaceFactory} from "contracts/src/core/spaces/SpaceFactory.sol";

import {console} from "forge-std/console.sol";

contract UpgradeTownOwner is ScriptUtils {
  SpaceFactory internal spaceFactory;
  TownOwner internal townOwner;

  function setUp() public {
    string memory spaceFactoryData = _readPackages("space-factory");

    spaceFactory = SpaceFactory(
      vm.parseJsonAddress(spaceFactoryData, ".spaceFactory")
    );
  }

  function run() public {
    uint256 deployerPrivateKey = _getPrivateKey();
    address deployer = vm.addr(deployerPrivateKey);

    vm.startBroadcast(deployerPrivateKey);
    SpaceFactory newSpaceFactory = new SpaceFactory();
    spaceFactory.setPaused(true);
    spaceFactory.upgradeTo(address(newSpaceFactory));
    townOwner = new TownOwner("Town Owner", "TOWN", deployer, 0);
    spaceFactory.setSpaceToken(address(townOwner));
    spaceFactory.setPaused(false);
    vm.stopBroadcast();

    console.log("SpaceFactory: %s", address(spaceFactory));
    console.log("TownOwner: %s", address(townOwner));
  }

  function _readPackages(
    string memory input
  ) internal view returns (string memory) {
    string memory inputDir = string.concat(
      vm.projectRoot(),
      "/packages/generated/"
    );

    string memory chainDir = string.concat(_getChainName(), "/addresses/");
    string memory file = string.concat(input, ".json");
    return vm.readFile(string.concat(inputDir, chainDir, file));
  }
}
