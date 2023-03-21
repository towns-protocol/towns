//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;

import {ScriptUtils} from "contracts/scripts/utils/ScriptUtils.sol";
import {Member} from "contracts/src/core/tokens/Member.sol";
import {console} from "forge-std/console.sol";
import "murky/Merkle.sol";

contract DeployMember is ScriptUtils {
  Member member;
  uint256 private NFT_PRICE = 0.08 ether;

  function run() external {
    address first = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    address second = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
    address third = address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);
    address fourth = address(0x90F79bf6EB2c4f870365E785982E1f101E93b906);
    address fifth = address(0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65);

    bytes32[] memory data = new bytes32[](5);

    data[0] = keccak256(abi.encodePacked(first, uint256(1)));
    data[1] = keccak256(abi.encodePacked(second, uint256(1)));
    data[2] = keccak256(abi.encodePacked(third, uint256(1)));
    data[3] = keccak256(abi.encodePacked(fourth, uint256(1)));
    data[4] = keccak256(abi.encodePacked(fifth, uint256(1)));

    Merkle m = new Merkle();
    bytes32 root = m.getRoot(data);

    string memory name = "Council Member";
    string memory symbol = "MEMBER";
    string
      memory baseURI = "https://bafybeihuygd5wm43kmxl4pocbv5uchdrkimhfwk75qgbmtlrqsy2bwwijq.ipfs.nftstorage.link/metadata/";

    vm.startBroadcast();
    member = new Member(name, symbol, baseURI, root);
    member.privateMint{value: NFT_PRICE}(first, 1, m.getProof(data, 0));
    member.privateMint{value: NFT_PRICE}(second, 1, m.getProof(data, 1));
    member.privateMint{value: NFT_PRICE}(third, 1, m.getProof(data, 2));
    member.privateMint{value: NFT_PRICE}(fourth, 1, m.getProof(data, 3));
    member.privateMint{value: NFT_PRICE}(fifth, 1, m.getProof(data, 4));
    vm.stopBroadcast();

    if (!_isTesting()) {
      _writeAddress("member", address(member));
      console.log("Deploying Council Member NFT: ", address(member));
    }
  }
}
