// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IL1StandardBridge} from "./interfaces/IL1StandardBridge.sol";
import {IL2StandardBridge} from "./interfaces/IL2StandardBridge.sol";

//libraries

//contracts
import {Interaction} from "../common/Interaction.s.sol";

contract InteractBaseBridge is Interaction {
  address l1StandardBridge = 0xfd0Bf71F60660E2f608ed56e1659C450eB113120;
  address l2StandardBridge = 0x4200000000000000000000000000000000000010;

  address townsOnSepolia = 0xfc85ff424F1b55fB3f9e920A47EC7255488C3bA3;
  address townsOnBaseSepolia = 0xd47972d8A64Fc4ea4435E31D5c8C3E65BD51e293;
  uint256 tokensToDeposit = 10 ether;

  function __interact(address deployer) internal override {
    // Bridge from Base Sepolia to Sepolia
    // vm.startBroadcast(deployer);
    // IERC20(townsOnBaseSepolia).approve(l2StandardBridge, tokensToDeposit);
    // IL2StandardBridge(l2StandardBridge).bridgeERC20({
    //   _localToken: townsOnBaseSepolia,
    //   _remoteToken: townsOnSepolia,
    //   _amount: tokensToDeposit,
    //   _minGasLimit: 100000,
    //   _extraData: ""
    // });
    // vm.stopBroadcast();

    // Bridge from Sepolia to Base Sepolia
    vm.startBroadcast(deployer);
    IERC20(townsOnSepolia).approve(l1StandardBridge, tokensToDeposit);
    IL1StandardBridge(l1StandardBridge).depositERC20({
      _l1Token: townsOnSepolia,
      _l2Token: townsOnBaseSepolia,
      _amount: tokensToDeposit,
      _minGasLimit: 100000,
      _extraData: ""
    });
    vm.stopBroadcast();
  }
}
