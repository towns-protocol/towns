// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {MerkleTree} from "contracts/test/utils/MerkleTree.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Member} from "contracts/src/tokens/Member.sol";
import {IMember} from "contracts/src/tokens/interfaces/IMember.sol";
import {StdStorage, stdStorage} from "forge-std/StdStorage.sol";

contract MemberTest is TestUtils {
  using stdStorage for StdStorage;

  StdStorage private stdstore;

  Member private _nft;
  MerkleTree private _merkle;

  uint256 private _NFT_PRICE = 0.08 ether;
  uint256 private _NFT_SUPPLY = 2500;

  bytes32[][] private _treeData;

  address[] private _accounts;
  uint256[] private _allowances;

  function setUp() public {
    //generate a _merkle root from the allowlisted users test data
    (_accounts, _allowances) = _mockWhitelist(10);

    _merkle = new MerkleTree();
    (bytes32 root, bytes32[][] memory tree) = _merkle.constructTree(
      _accounts,
      _allowances
    );
    _treeData = tree;

    //deploy the _nft
    _nft = new Member("Member", "MBR", "baseUri", root);
  }

  /// if public minting has not started, normal mints should fail
  function testFailPublicMintingNotOpen() public {
    _nft.publicMint(_randomAddress());
  }

  /// if no eth is sent, the mint should fail
  function testFailNoMintPricePaid() public {
    _nft.startWaitlistMint();
    _nft.startPublicMint();
    _nft.publicMint(_randomAddress());
  }

  /// if wrong eth is sent, the mint should fail
  function testFailWrongMintPricePaid() public {
    _nft.startWaitlistMint();
    _nft.startPublicMint();
    _nft.publicMint{value: 5 ether}(_randomAddress());
  }

  /// if public minting is opened and the correct amount is sent, the mint should succeed
  function testMintPricePaid() public {
    _nft.startWaitlistMint();
    _nft.startPublicMint();
    _nft.publicMint{value: _NFT_PRICE}(_randomAddress());
  }

  /// if a user mints an _nft, the uri should exist for that token id
  function testUriMatches() public {
    _nft.startWaitlistMint();
    _nft.startPublicMint();
    _nft.publicMint{value: _NFT_PRICE}(_randomAddress());
    assertEq(
      _nft.tokenURI(0),
      string(abi.encodePacked("baseUri", "councilmetadata"))
    );
  }

  /// if user is waitlisted only (allowance = 0), minting should fail if in allowlist minting period
  function testRevertAllowlistMintOnlyWaitlisted() public {
    uint256 position = _findAllowancePosition(0);
    address account = _accounts[position];
    uint256 allowance = _allowances[position];

    bytes32[] memory proof = _merkle.getProof(_treeData, position);

    vm.expectRevert(IMember.NotAllowed.selector);
    _nft.privateMint{value: _NFT_PRICE}(account, allowance, proof);
  }

  /// if the proof generation is invalid, the test should fail
  function testRevertAllowlistMintBadProof() public {
    uint256 position = _randomUint256();
    uint256 allowance = 1;

    bytes32[] memory proof = _merkle.getProof(_treeData, position);

    vm.expectRevert(IMember.InvalidProof.selector);
    _nft.privateMint{value: _NFT_PRICE}(_randomAddress(), allowance, proof);
  }

  /// if the minting period is in the waitlist, waitlisted users should be able to mint
  function testWaitlistMintWaitlisted() public {
    _nft.startWaitlistMint();

    uint256 position = _findAllowancePosition(0);
    address account = _accounts[position];
    uint256 allowance = _allowances[position];

    bytes32[] memory proof = _merkle.getProof(_treeData, position);
    _nft.privateMint{value: _NFT_PRICE}(account, allowance, proof);
  }

  //if the minting period is in the waitlist, allowlisted users should *still* be able to mint
  function testWaitlistMintAllowlisted() public {
    _nft.startWaitlistMint();

    uint256 position = _findAllowancePosition(1);
    address account = _accounts[position];
    uint256 allowance = _allowances[position];

    bytes32[] memory proof = _merkle.getProof(_treeData, position);
    _nft.privateMint{value: _NFT_PRICE}(account, allowance, proof);
  }

  /// if the user is on the allowlist, they should be able to mint immediately
  function testAllowlistMint() public {
    uint256 position = _findAllowancePosition(1);
    address account = _accounts[position];
    uint256 allowance = _allowances[position];

    bytes32[] memory proof = _merkle.getProof(_treeData, position);
    _nft.privateMint{value: _NFT_PRICE}(account, allowance, proof);
  }

  /// if the total supply has been minted, further mints should fail
  function testRevertMaxSupplyReached() public {
    uint256 slot = stdstore
      .target(address(_nft))
      .sig("currentTokenId()")
      .find();
    bytes32 loc = bytes32(slot);
    bytes32 mockedCurrentTokenId = bytes32(abi.encode(_NFT_SUPPLY));
    vm.store(address(_nft), loc, mockedCurrentTokenId);

    _nft.startWaitlistMint();
    _nft.startPublicMint();

    vm.expectRevert(IMember.MaxSupplyReached.selector);
    _nft.publicMint{value: _NFT_PRICE}(_randomAddress());
  }

  //if trying to mint to the zero address, minting should fail
  function testFailMintToZeroAddress() public {
    _nft.startWaitlistMint();
    _nft.startPublicMint();
    _nft.publicMint{value: _NFT_PRICE}(address(0));
  }

  //if a user successfully mints, verify that they become the owner of the _nft
  function testNewMintOwnerRegistered() public {
    _nft.startWaitlistMint();
    _nft.startPublicMint();
    _nft.publicMint{value: _NFT_PRICE}(address(2));
    _nft.publicMint{value: _NFT_PRICE}(address(1));

    uint256 slotOfNewOwner = stdstore
      .target(address(_nft))
      .sig(_nft.ownerOf.selector)
      .with_key(1)
      .find();

    uint160 ownerOfTokenIdOne = uint160(
      uint256((vm.load(address(_nft), bytes32(abi.encode(slotOfNewOwner)))))
    );

    assertEq(address(ownerOfTokenIdOne), address(1));
  }

  /// if a user mints, they should not be able to mint again
  function testRevertSecondMint() public {
    _nft.startWaitlistMint();
    _nft.startPublicMint();

    _nft.publicMint{value: _NFT_PRICE}(address(1));

    uint256 slotBalance = stdstore
      .target(address(_nft))
      .sig(_nft.balanceOf.selector)
      .with_key(address(1))
      .find();

    uint256 balanceFirstMint = uint256(
      vm.load(address(_nft), bytes32(slotBalance))
    );
    assertEq(balanceFirstMint, 1);

    //This should fail
    vm.expectRevert(IMember.AlreadyMinted.selector);
    _nft.publicMint{value: _NFT_PRICE}(address(1));
  }

  /// if a contract implements the erc721received function, it should be able to be minted to
  function testSafeContractReceiver() public {
    _nft.startWaitlistMint();
    _nft.startPublicMint();

    Receiver receiver = new Receiver();
    _nft.publicMint{value: _NFT_PRICE}(address(receiver));
    uint256 slotBalance = stdstore
      .target(address(_nft))
      .sig(_nft.balanceOf.selector)
      .with_key(address(receiver))
      .find();

    uint256 balance = uint256(vm.load(address(_nft), bytes32(slotBalance)));
    assertEq(balance, 1);
  }

  /// contracts should not be able to receive this NFT if they dont implement erc721 received
  function testFailUnSafeContractReceiver() public {
    _nft.startWaitlistMint();
    _nft.startPublicMint();

    vm.etch(address(1), bytes("mock code"));
    _nft.publicMint{value: _NFT_PRICE}(address(1));
  }

  /// if there is a balance, the owner should be able to withdraw it
  function testWithdrawalWorksAsOwner() public {
    _nft.startWaitlistMint();
    _nft.startPublicMint();

    // Mint an NFT, sending eth to the contract
    Receiver receiver = new Receiver();
    address payable payee = payable(address(0x55));
    uint256 priorPayeeBalance = payee.balance;
    _nft.publicMint{value: _NFT_PRICE}(address(receiver));

    // Check that the balance of the contract is correct
    assertEq(address(_nft).balance, _NFT_PRICE);
    uint256 nftBalance = address(_nft).balance;

    // Withdraw the balance and assert it was transferred
    _nft.withdrawPayments(payee);
    assertEq(payee.balance, priorPayeeBalance + nftBalance);
  }

  /// if there is a balance, a non-owner should not be able to withdraw from it
  function testWithdrawalFailsAsNotOwner() public {
    _nft.startWaitlistMint();
    _nft.startPublicMint();

    // Mint an NFT, sending eth to the contract
    Receiver receiver = new Receiver();
    _nft.publicMint{value: _NFT_PRICE}(address(receiver));

    // Check that the balance of the contract is correct
    assertEq(address(_nft).balance, _NFT_PRICE);

    // Confirm that a non-owner cannot withdraw
    vm.expectRevert();
    vm.prank(address(0x55));
    _nft.withdrawPayments(payable(address(0x55)));
  }

  // =============================================================
  //                          INTERNAL
  // =============================================================

  function _findAllowancePosition(
    uint256 allowanceType
  ) internal view returns (uint256) {
    uint256 position = 0;
    for (uint256 i = 0; i < _allowances.length; i++) {
      if (_allowances[i] == allowanceType) {
        position = i;
        break;
      }
    }
    return position;
  }

  function _mockWhitelist(
    uint256 amount
  ) internal view returns (address[] memory, uint256[] memory) {
    address[] memory addresses = new address[](amount);
    uint256[] memory allowances = new uint256[](amount);

    for (uint256 i = 0; i < amount; i++) {
      addresses[i] = _randomAddress();
      allowances[i] = _randomUint256() % 2;
    }

    return (addresses, allowances);
  }
}

/// a contract that can be used to test the erc721 received function
contract Receiver is IERC721Receiver {
  function onERC721Received(
    address,
    address,
    uint256,
    bytes calldata
  ) external pure override returns (bytes4) {
    return this.onERC721Received.selector;
  }
}
