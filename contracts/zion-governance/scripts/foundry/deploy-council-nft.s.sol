// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
import "forge-std/Script.sol";
import {CouncilNFT} from "../../contracts/council/CouncilNFT.sol";
import "murky/Merkle.sol";
import "openzeppelin-contracts/contracts/utils/Strings.sol";

contract DeployCouncilOfZionNFTScript is Script {
    using Strings for uint256;

    uint256 private NFT_PRICE = 0.08 ether;

    function run() external {
        vm.startBroadcast();

        address first = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        address second = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        address third = address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);
        address fourth = address(0x90F79bf6EB2c4f870365E785982E1f101E93b906);

        bytes32[] memory data = new bytes32[](4);

        data[0] = keccak256(abi.encodePacked(first, uint(1)));
        data[1] = keccak256(abi.encodePacked(second, uint(1)));
        data[2] = keccak256(abi.encodePacked(third, uint(1)));
        data[3] = keccak256(abi.encodePacked(fourth, uint(1)));

        Merkle m = new Merkle();
        bytes32 root = m.getRoot(data);

        string memory name = "Zion Council";
        string memory symbol = "ZC";
        string
            memory baseURI = "https://bafybeihuygd5wm43kmxl4pocbv5uchdrkimhfwk75qgbmtlrqsy2bwwijq.ipfs.nftstorage.link/metadata/";
        CouncilNFT councilNFT = new CouncilNFT(name, symbol, baseURI, root);
        console.log("Deploying Zion Council NFT: ", address(councilNFT));

        vm.stopBroadcast();
    }
}
