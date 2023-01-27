// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "forge-std/Test.sol";

import {Zioneer} from "contracts/src/governance/tokens/Zioneer.sol";
import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";

contract ZioneerTest is Test {
  using stdStorage for StdStorage;

  address bob = address(0x1);
  address alice = address(0x2);

  Zioneer private nft;

  uint256 constant INITIAL_CONTRACT_BALANCE = 5 ether;

  function setUp() public {
    nft = new Zioneer("Zioneer", "ZNE", "https://zioneer.io/");
    // insert eth into the Zioneer contract to be rewarded to zioneer NFT mintees
    (bool success, ) = address(nft).call{value: 5 ether}("");
    require(success, "failed to insert eth into zioneer contract");
  }

  // helper method that checks for array equality of addresses
  function assertEqArray(address[] memory a, address[] memory b) internal {
    assertEq(a.length, b.length);
    for (uint256 i = 0; i < a.length; i++) {
      assertEq(a[i], b[i]);
    }
  }

  // helper method that copies the allowedAddressesList array from the Zioneer contract
  function copyAllowedAddressesList(
    Zioneer z
  ) internal view returns (address[] memory) {
    uint256 length = z.allowedAddressesListLength();
    address[] memory allowedAddresses = new address[](length);
    for (uint256 i = 0; i < length; i++) {
      allowedAddresses[i] = z.allowedAddressesList(i);
    }
    return allowedAddresses;
  }

  function testMint() public {
    vm.expectRevert(Zioneer.NotAllowed.selector);
    nft.mintTo(bob);

    nft.setAllowed(address(this), true);
    nft.mintTo(bob);
    assertEq(nft.balanceOf(bob), 1);
  }

  function testMaxSupplyReached() public {
    nft.setAllowed(address(this), true);

    uint256 slot = stdstore.target(address(nft)).sig("currentTokenId()").find();
    bytes32 loc = bytes32(slot);
    bytes32 mockedCurrentTokenId = bytes32(abi.encode(10000));
    vm.store(address(nft), loc, mockedCurrentTokenId);

    vm.expectRevert(Zioneer.MaxSupplyReached.selector);
    nft.mintTo(bob);
  }

  function testMintZeroAddress() public {
    nft.setAllowed(address(this), true);
    vm.expectRevert(Zioneer.NotAllowed.selector);
    nft.mintTo(address(0));
  }

  /**
    ########################################
    TEST: RECEIVE ETH
    ########################################
  */

  function testReceiveEth() public {
    // first, the contract's balance is equal to INITIAL_CONTRACT_BALANCE = 5
    assertEq(address(nft).balance, INITIAL_CONTRACT_BALANCE);

    // then we send 1 eth to the contract
    (bool success, ) = address(nft).call{value: 1 ether}("");
    require(success, "failed to send eth to zioneer contract");

    // the contract's balance is now 6 eth
    assertEq(address(nft).balance, 6 ether);
  }

  /**
    ########################################
    TEST: WITHDRAW
    ########################################
  */

  function testWithdrawAtOnce() public {
    // first, the contract's balance is equal to INITIAL_CONTRACT_BALANCE = 5
    assertEq(address(nft).balance, INITIAL_CONTRACT_BALANCE);

    // alice's balance is 0
    assertEq(alice.balance, 0);

    // withdraw all ETH to alice
    nft.withdraw(alice);

    // alice's balance is 5 eth
    assertEq(alice.balance, 5 ether);

    // the contract's balance is 0 eth
    assertEq(address(nft).balance, 0);
  }

  function testUnauthorizedWithdrawal() public {
    vm.prank(bob);
    vm.expectRevert("Ownable: caller is not the owner");
    nft.withdraw(bob);
  }

  /**
    ########################################
    TEST: MINT REWARDS
    ########################################
  */

  function testMintRewarding() public {
    // first, bob's balance is 0
    assertEq(bob.balance, 0);

    // minting to bob
    nft.setAllowed(address(this), true);
    nft.mintTo(bob);

    // bob's balance is 0.1 eth due to the rewarding
    assertEq(bob.balance, 0.1 ether);

    // plus he still has the nft
    assertEq(nft.balanceOf(bob), 1);
  }

  function testMintRewardingMultiple() public {
    // first, bob's balance is 0
    assertEq(bob.balance, 0);

    // minting to bob
    nft.setAllowed(address(this), true);
    nft.mintTo(bob);
    nft.mintTo(bob);
    nft.mintTo(bob);

    // bob's balance is 0.3 eth due to the rewarding
    assertEq(bob.balance, 0.3 ether);

    // plus he still has the nft
    assertEq(nft.balanceOf(bob), 3);
  }

  function testMintRewardAfterSetMintReward() public {
    // first, bob's balance is 0
    assertEq(bob.balance, 0);

    nft.setAllowed(address(this), true);
    nft.setMintReward(0.2 ether);
    nft.mintTo(bob);

    // bob's balance is 0.2 eth due to the rewarding
    assertEq(bob.balance, 0.2 ether);

    // plus he still has the nft
    assertEq(nft.balanceOf(bob), 1);
  }

  function testMintRewardAfterZeroMintReward() public {
    // first, bob's balance is 0
    assertEq(bob.balance, 0);

    nft.setAllowed(address(this), true);
    nft.setMintReward(0 ether);
    nft.mintTo(bob);

    // bob's balance is unchanged after rewarding
    assertEq(bob.balance, 0);

    // plus he still has the nft
    assertEq(nft.balanceOf(bob), 1);
  }

  function testUnauthorizedSetMintReward() public {
    vm.prank(bob);
    vm.expectRevert("Ownable: caller is not the owner");
    nft.setMintReward(0.2 ether);
  }

  function testFailMintRecipientNotPayable() public {
    // first, create a non-payable contract
    ERC721 nonPayable = new ERC721("Not Payable", "NP");

    // minting to non-payable contract
    nft.setAllowed(address(this), true);

    // this should fail because the recipient is not payable
    nft.mintTo(address(nonPayable));
  }

  /**
    ########################################
    TEST: SET ALLOWED
    ########################################
  */

  function testSetAllowedInitialState() public {
    address[] memory currentAllowedAddressesList = copyAllowedAddressesList(
      nft
    );
    address[] memory expectedAllowedAddresses = new address[](0);

    assertEq(nft.allowed(address(this)), false);
    assertEq(nft.allowedAddressesListLength(), 0);
    assertEqArray(currentAllowedAddressesList, expectedAllowedAddresses);
  }

  function testSetAllowedOneAddress() public {
    nft.setAllowed(address(this), true);
    address[] memory currentAllowedAddressesList = copyAllowedAddressesList(
      nft
    );
    address[] memory expectedAllowedAddresses = new address[](1);
    expectedAllowedAddresses[0] = address(this);

    assertEq(nft.allowed(address(this)), true);
    assertEq(nft.allowedAddressesListLength(), 1);
    assertEqArray(currentAllowedAddressesList, expectedAllowedAddresses);
  }

  function testSetAllowedAddSameAddressTwice() public {
    nft.setAllowed(address(this), true);
    nft.setAllowed(address(this), true);
    address[] memory currentAllowedAddressesList = copyAllowedAddressesList(
      nft
    );
    address[] memory expectedAllowedAddresses = new address[](1);
    expectedAllowedAddresses[0] = address(this);

    assertEq(nft.allowed(address(this)), true);
    assertEq(nft.allowedAddressesListLength(), 1);
    assertEqArray(currentAllowedAddressesList, expectedAllowedAddresses);
  }

  function testSetAllowedAddThenRemove() public {
    nft.setAllowed(address(this), true);
    nft.setAllowed(address(this), false);
    address[] memory currentAllowedAddressesList = copyAllowedAddressesList(
      nft
    );
    address[] memory expectedAllowedAddresses = new address[](0);

    assertEq(nft.allowed(address(this)), false);
    assertEq(nft.allowedAddressesListLength(), 0);
    assertEqArray(currentAllowedAddressesList, expectedAllowedAddresses);
  }

  function testSetAllowedAddMultiple() public {
    nft.setAllowed(address(this), true);
    nft.setAllowed(address(alice), true);
    nft.setAllowed(address(bob), true);
    address[] memory currentAllowedAddressesList = copyAllowedAddressesList(
      nft
    );
    address[] memory expectedAllowedAddresses = new address[](3);
    expectedAllowedAddresses[0] = address(this);
    expectedAllowedAddresses[1] = address(alice);
    expectedAllowedAddresses[2] = address(bob);

    assertEq(nft.allowed(address(this)), true);
    assertEq(nft.allowed(address(alice)), true);
    assertEq(nft.allowed(address(bob)), true);
    assertEq(nft.allowedAddressesListLength(), 3);
    assertEqArray(currentAllowedAddressesList, expectedAllowedAddresses);
  }

  function testSetAllowedAddAndRemoveMultiple() public {
    nft.setAllowed(address(this), true); // [this]
    nft.setAllowed(address(alice), true); // [this, alice]
    nft.setAllowed(address(bob), true); // [this, alice, bob]
    nft.setAllowed(address(bob), true); // [this, alice, bob] (no change)
    nft.setAllowed(address(alice), false); // [this, bob]
    nft.setAllowed(address(alice), false); // [this, bob] (no change)
    nft.setAllowed(address(this), false); // [bob]
    nft.setAllowed(address(this), true); // [bob, this]
    nft.setAllowed(address(alice), true); // [bob, this, alice]
    nft.setAllowed(address(this), false); // [bob, alice]

    address[] memory currentAllowedAddressesList = copyAllowedAddressesList(
      nft
    );
    address[] memory expectedAllowedAddresses = new address[](2);
    expectedAllowedAddresses[0] = address(bob);
    expectedAllowedAddresses[1] = address(alice);

    assertEq(nft.allowed(address(this)), false);
    assertEq(nft.allowed(address(alice)), true);
    assertEq(nft.allowed(address(bob)), true);
    assertEq(nft.allowedAddressesListLength(), 2);
    assertEqArray(currentAllowedAddressesList, expectedAllowedAddresses);
  }
}
