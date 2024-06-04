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

  address riverOnSepolia = 0x40eF1bb984503bb5Adef041A88a4F9180e8586f9;
  address riverOnBaseSepolia = 0x49442708a16Bf7917764F14A2D103f40Eb27BdD8;
  uint256 tokensToDeposit = 1_000_000 ether;

  address oldRiverOnBaseSepolia = 0xDaF401580d509117738bF1F38D2CD4ABAEd3c2c5;

  function __interact(address deployer) public override {
    // Bridge from Base Sepolia to Sepolia
    // vm.startBroadcast(deployer);
    // IERC20(oldRiverOnBaseSepolia).approve(l2StandardBridge, tokensToDeposit);
    // IL2StandardBridge(l2StandardBridge).bridgeERC20({
    //   _localToken: oldRiverOnBaseSepolia,
    //   _remoteToken: riverOnSepolia,
    //   _amount: tokensToDeposit,
    //   _minGasLimit: 100000,
    //   _extraData: ""
    // });
    // vm.stopBroadcast();

    // Bridge from Sepolia to Base Sepolia
    vm.startBroadcast(deployer);
    IERC20(riverOnSepolia).approve(l1StandardBridge, tokensToDeposit);
    IL1StandardBridge(l1StandardBridge).depositERC20({
      _l1Token: riverOnSepolia,
      _l2Token: riverOnBaseSepolia,
      _amount: tokensToDeposit,
      _minGasLimit: 100000,
      _extraData: ""
    });
    vm.stopBroadcast();
  }
}
