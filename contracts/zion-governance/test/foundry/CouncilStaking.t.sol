// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import  "./../../contracts/council/CouncilNFT.sol";
import {MerkleHelper} from "./utils/MerkleHelper.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./../../contracts/council/libraries/Errors.sol";
import {DataTypes} from "../../contracts/council/libraries/DataTypes.sol";
import {CouncilStaking} from  "./../../contracts/council/CouncilStaking.sol";


contract CouncilStakingTest is Test, MerkleHelper {
  CouncilNFT private nft;
  CouncilStaking private staking;
  Merkle private merkle;

  uint256 private NFT_PRICE = 0.08 ether;
  uint256 private NFT_SUPPLY = 2500;

  bytes32[] private allowlistData;
  uint256 tokenId;

  function setUp() public {
    _initPositionsAllowances();
    allowlistData = _generateAllowlistData();
    merkle = new Merkle();
    bytes32 root = merkle.getRoot(allowlistData);
    nft = new CouncilNFT("Zion", "zion", "baseUri", root);
    staking = new CouncilStaking(IERC721(address(nft)));

    uint256 position = userPositionMap[allowlist1];
    uint256 allowance = userAllowanceMap[allowlist1];

    vm.prank(allowlist1);
    bytes32[] memory proof = merkle.getProof(allowlistData, position);
    tokenId = nft.privateMint{value: NFT_PRICE}(allowlist1, allowance, proof);

    vm.prank(allowlist1);
    nft.approve(address(staking), tokenId);
  }

  function testStakeToken() public {
    vm.prank(allowlist1);
    vm.expectEmit(true, true, false, false);

    emit Events.Staked(allowlist1, tokenId);
    staking.stakeToken(tokenId);

    assertEq(staking.getStakerAddressByTokenId(tokenId), allowlist1);
    assertEq(staking.totalSupply(), 1);
  }

  function testNotTokenOwner() public {
    vm.expectRevert(Errors.NotTokenOwner.selector);
    vm.prank(allowlist2);
    staking.stakeToken(tokenId);
  }

  function testWithdrawTokens() public {
    vm.prank(allowlist1);
    staking.stakeToken(tokenId);

    assertEq(staking.getStakerByAddress(allowlist1).amountStaked, 1);

    vm.prank(allowlist1);
    staking.withdrawToken(tokenId);

    assertEq(staking.getStakerAddressByTokenId(tokenId), address(0));

    DataTypes.Staker memory staker = staking.getStakerByAddress(allowlist1);

    assertEq(staker.amountStaked, 0);
  }

  function testClaimPoints() public {
    vm.prank(allowlist1);
    staking.stakeToken(tokenId);

    vm.warp(10);

    uint256 points = staking.getAvailablePoints(allowlist1);
    assertGt(points, 0);

    vm.expectEmit(true, true, false, false);
    vm.prank(allowlist1);
    staking.claimPoints();
    emit Events.PointsClaimed(allowlist1, points);

    assertEq(staking.getAvailablePoints(allowlist1), 0);
  }

  function testRevertClaimPoints() public {
    vm.prank(allowlist1);
    staking.stakeToken(tokenId);

    vm.expectRevert(Errors.NoPointsToClaim.selector);
    vm.prank(allowlist1);
    staking.claimPoints();

    assertEq(staking.getAvailablePoints(allowlist1), 0);
  }

  function testGetStakerByAddress() public {
    vm.prank(allowlist1);
    staking.stakeToken(tokenId);

    assertGt(staking.getStakerByAddress(allowlist1).amountStaked, 0);
  }

  function testGetStakerAddressByTokenId() public {
    vm.prank(allowlist1);
    staking.stakeToken(tokenId);

    assertEq(staking.getStakerAddressByTokenId(tokenId), allowlist1);
  }

  function testGetStakedTokensByAddress() public {
    vm.prank(allowlist1);
    staking.stakeToken(tokenId);

    vm.prank(allowlist1);
    DataTypes.StakedToken[] memory _stakedTokens = staking.getStakedTokensByAddress(allowlist1);

    for (uint256 i = 0; i < _stakedTokens.length; i++) {
      assertEq(_stakedTokens[i].staker, allowlist1);
    }
  }

  function testGetAvailablePoints() public {
    vm.prank(allowlist1);
    staking.stakeToken(tokenId);
    vm.warp(20);
    assertGt(staking.getAvailablePoints(allowlist1), 0);
  }
}
