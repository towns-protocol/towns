// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//interfaces

//libraries
import {MerkleTree} from "contracts/test/utils/MerkleTree.sol";

//contracts
import {Deployer} from "contracts/scripts/common/Deployer.s.sol";
import {Member} from "contracts/src/tokens/Member.sol";

contract DeployMember is Deployer {
  Member private member;
  MerkleTree private merkle;

  function versionName() public pure override returns (string memory) {
    return "member";
  }

  function __deploy(address deployer) public override returns (address) {
    vm.startBroadcast(deployer);
    member = new Member(
      "Council Member",
      "MEMBER",
      "https://bafybeihuygd5wm43kmxl4pocbv5uchdrkimhfwk75qgbmtlrqsy2bwwijq.ipfs.nftstorage.link/metadata/",
      ""
    );
    member.startWaitlistMint();
    member.startPublicMint();
    vm.stopBroadcast();
    return address(member);
  }

  function deployWithProof(address deployer) public returns (address) {
    address[] memory accounts = new address[](5);
    accounts[0] = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    accounts[1] = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
    accounts[2] = address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);
    accounts[3] = address(0x90F79bf6EB2c4f870365E785982E1f101E93b906);
    accounts[4] = address(0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65);

    uint256[] memory allowances = new uint256[](5);
    allowances[0] = 1;
    allowances[1] = 1;
    allowances[2] = 1;
    allowances[3] = 1;
    allowances[4] = 1;

    merkle = new MerkleTree();
    (bytes32 root, bytes32[][] memory tree) = merkle.constructTree(
      accounts,
      allowances
    );

    vm.startBroadcast(deployer);
    member = new Member(
      "Council Member",
      "MEMBER",
      "https://bafybeihuygd5wm43kmxl4pocbv5uchdrkimhfwk75qgbmtlrqsy2bwwijq.ipfs.nftstorage.link/metadata/",
      root
    );

    member.privateMint{value: member.MINT_PRICE()}(
      accounts[0],
      allowances[0],
      merkle.getProof(tree, 0)
    );

    member.privateMint{value: member.MINT_PRICE()}(
      accounts[1],
      allowances[1],
      merkle.getProof(tree, 1)
    );

    member.privateMint{value: member.MINT_PRICE()}(
      accounts[2],
      allowances[2],
      merkle.getProof(tree, 2)
    );

    member.startWaitlistMint();
    member.startPublicMint();
    vm.stopBroadcast();
    return address(member);
  }
}
