// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

//interfaces
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

//libraries

//contracts
import {Interaction} from "../common/Interaction.s.sol";

interface IL1StandardBridge {
  function depositETH(
    uint32 _minGasLimit,
    bytes calldata _extraData
  ) external payable;

  function depositETHTo(
    address _to,
    uint32 _minGasLimit,
    bytes calldata _extraData
  ) external payable;

  function depositERC20(
    address _l1Token,
    address _l2Token,
    uint256 _amount,
    uint32 _minGasLimit,
    bytes calldata _extraData
  ) external;

  function depositERC20To(
    address _l1Token,
    address _l2Token,
    address _to,
    uint256 _amount,
    uint32 _minGasLimit,
    bytes calldata _extraData
  ) external;
}

contract InteractBaseBridge is Interaction {
  address l1StandardBridge = 0xfd0Bf71F60660E2f608ed56e1659C450eB113120;

  function __interact(uint256 pk, address) public override {
    // vm.broadcast(pk);
    // IL1StandardBridge(l1StandardBridge).depositETH{value: 0.001 ether}(
    //   100000,
    //   ""
    // );

    address riverOnSepolia = 0x40eF1bb984503bb5Adef041A88a4F9180e8586f9;
    address riverOnBaseSepolia = 0xDaF401580d509117738bF1F38D2CD4ABAEd3c2c5;

    vm.startBroadcast(pk);
    IERC20(riverOnSepolia).approve(l1StandardBridge, 2 ether);
    IL1StandardBridge(l1StandardBridge).depositERC20({
      _l1Token: riverOnSepolia,
      _l2Token: riverOnBaseSepolia,
      _amount: 2 ether,
      _minGasLimit: 100000,
      _extraData: ""
    });
    vm.stopBroadcast();
  }
}
