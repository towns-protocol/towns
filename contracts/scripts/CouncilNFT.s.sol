//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.13;
import "forge-std/Script.sol";
import {CouncilNFT} from "../src/council/CouncilNFT.sol";
import "murky/Merkle.sol";
import "openzeppelin-contracts/contracts/utils/Strings.sol";
import {Helper} from "./Helper.sol";
import "solidity-json-writer/JsonWriter.sol";

contract DeployCouncilNFT is Script {
  using Strings for uint256;
  using JsonWriter for JsonWriter.Json;

  JsonWriter.Json writer;

  uint256 private NFT_PRICE = 0.08 ether;

  function run() external {
    vm.startBroadcast();

    address first = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    address second = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
    address third = address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);
    address fourth = address(0x90F79bf6EB2c4f870365E785982E1f101E93b906);

    bytes32[] memory data = new bytes32[](4);

    data[0] = keccak256(abi.encodePacked(first, uint256(1)));
    data[1] = keccak256(abi.encodePacked(second, uint256(1)));
    data[2] = keccak256(abi.encodePacked(third, uint256(1)));
    data[3] = keccak256(abi.encodePacked(fourth, uint256(1)));

    Merkle m = new Merkle();
    bytes32 root = m.getRoot(data);

    string memory name = "Zion Council";
    string memory symbol = "ZC";
    string
      memory baseURI = "https://bafybeihuygd5wm43kmxl4pocbv5uchdrkimhfwk75qgbmtlrqsy2bwwijq.ipfs.nftstorage.link/metadata/";
    CouncilNFT councilNFT = new CouncilNFT(name, symbol, baseURI, root);
    console.log("Deploying Zion Council NFT: ", address(councilNFT));

    councilNFT.privateMint{value: NFT_PRICE}(first, 1, m.getProof(data, 0));
    councilNFT.privateMint{value: NFT_PRICE}(second, 1, m.getProof(data, 1));
    councilNFT.privateMint{value: NFT_PRICE}(third, 1, m.getProof(data, 2));
    councilNFT.privateMint{value: NFT_PRICE}(fourth, 1, m.getProof(data, 3));

    writer = writer.writeStartObject();
    writer = writer.writeStringProperty(
      "councilnft",
      vm.toString(abi.encodePacked(address(councilNFT)))
    );
    writer = writer.writeEndObject();

    string memory path = string.concat(
      "packages/contracts/",
      Helper.getChainName(),
      "/addresses/council.json"
    );

    vm.writeFile(path, writer.value);

    vm.stopBroadcast();
  }
}
