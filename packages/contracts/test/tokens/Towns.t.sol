// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {Towns} from "contracts/src/tokens/Towns.sol";

contract TownsTest is TestUtils {
  Towns internal towns;
  address internal deployer;

  uint256 internal recipientPrivateKey;
  address internal receiver;

  function setUp() external {
    deployer = _randomAddress();

    recipientPrivateKey = _randomUint256();
    receiver = vm.addr(recipientPrivateKey);

    vm.prank(deployer);
    towns = new Towns("Towns", "TOWNS");
  }

  function test_mintTo() external {
    uint256 amount = 5 ether;

    uint256 totalSupply = towns.totalSupply();
    uint256 receiverBalance = towns.balanceOf(receiver);

    vm.prank(deployer);
    towns.mintTo(receiver, amount);

    assertEq(towns.totalSupply(), totalSupply + amount);
    assertEq(towns.balanceOf(receiver), receiverBalance + amount);
  }

  function test_setTransfers() external {
    address _randomReceiver = _randomAddress();

    vm.prank(deployer);
    towns.mintTo(receiver, 1 ether);
    assertEq(towns.balanceOf(receiver), 1 ether);

    // disable transfers
    vm.prank(deployer);
    towns.setTransfers(false);

    // transfers are disabled, so the transfer should fail
    vm.prank(receiver);
    vm.expectRevert("Towns: transfers disabled");
    towns.transfer(_randomReceiver, 0.1 ether);

    // transfers are disabled, but still allowed to mint
    vm.prank(deployer);
    towns.mintTo(_randomReceiver, 0.1 ether);

    assertEq(towns.balanceOf(_randomReceiver), 0.1 ether);
  }

  function test_setAllowedTransfers() external {
    address airdrop = address(new MockAirdrop(address(towns)));

    vm.prank(deployer);
    towns.mintTo(airdrop, 10 ether);
    assertEq(towns.balanceOf(airdrop), 10 ether);

    // disable transfers
    vm.prank(deployer);
    towns.setTransfers(false);

    // transfers are disabled, so the transfer should fail
    vm.prank(airdrop);
    vm.expectRevert("Towns: transfers disabled");
    towns.transfer(receiver, 0.1 ether);

    // add airdrop to allowed transfers
    vm.prank(deployer);
    towns.setAllowedTransfers(airdrop, true);

    // transfers are disabled, but allowed for airdrop
    vm.prank(airdrop);
    towns.transfer(receiver, 0.1 ether);

    // transfers are disabled, so the transfer should fail for receiver
    vm.prank(receiver);
    vm.expectRevert("Towns: transfers disabled");
    towns.transfer(_randomAddress(), 0.1 ether);
  }
}

contract MockAirdrop {
  address public token;

  constructor(address _token) {
    token = _token;
  }

  function transfer(address to, uint256 amount) external {
    Towns(token).transfer(to, amount);
  }
}
