// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Interaction} from "../common/Interaction.s.sol";
import {Airdrop} from "contracts/src/utils/Airdrop.sol";

contract InteractAirdrop is Interaction {
  function __interact(address deployer) public override {
    address airdrop = getDeployment("airdrop");

    uint256 totalAccounts = 20;
    uint256 index;

    address[] memory addresses = new address[](totalAccounts);
    uint256[] memory amounts = new uint256[](totalAccounts);

    addresses[index++] = 0x406d4B68d5B0797C5d26437938958f2bb2E9c84E;
    addresses[index++] = 0xfC4Fc482d1551a045189b998edA86e3cBa35d7c6;
    addresses[index++] = 0xd2F4c40C2c5C6A9730f5C7191F5286EEff241DEF;
    addresses[index++] = 0x2FaC60B7bCcEc9b234A2f07448D3B2a045d621B9;
    addresses[index++] = 0x5DA35F41Df4bb4fe9D6B97Cd08951fE7EA684398;
    addresses[index++] = 0x1cf62EE141da89f9575A9Ac83884fd75450ea668;
    addresses[index++] = 0xbB29f0d47678BBc844f3B87F527aBBbab258F051;
    addresses[index++] = 0x3AA5F39E076de798321B845eeb1f43ab8E5efa53;
    addresses[index++] = 0x81E5aC8dA459eE1323cdA834855d29e101F166E1;
    addresses[index++] = 0x17BA011308A820332fD0245a89E0551b6772d826;
    addresses[index++] = 0x83ef9fEA524DBE449Ab107cFcC6E4205b11Bf2E1;
    addresses[index++] = 0x2198DB4FCAB6bED053c36403032febA40B950047;
    addresses[index++] = 0x8016401D260726539BcbF1c05f6620944C04eD46;
    addresses[index++] = 0x43ad099f942C7607E4FEA56F0E17F44788fF9AB4;
    addresses[index++] = 0xdD38f998178cBcb271bCaEd921a7889567cB1127;
    addresses[index++] = 0xc503B6b64810B6Ea8F634eb54Df283F507e60F39;
    addresses[index++] = 0x44EDBA3Ef11E1DB85F35A2B8a4c74c6ec23D355e;
    addresses[index++] = 0x376eC15Fa24A76A18EB980629093cFFd559333Bb;
    addresses[index++] = 0xa52F90d3729D78349bDa7f975f6780C03AfDb029;

    // test wallets
    addresses[index++] = 0x53F434419d4d95Ca5c49Fe8Fc77F4C42F67FC59D;

    index = 0;

    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 0.01 ether;
    amounts[index++] = 5 ether;

    require(index == totalAccounts, "InteractAirdrop: invalid index");

    uint256 totalValue;

    for (uint256 i = 0; i < totalAccounts; i++) {
      totalValue += amounts[i];
    }

    vm.startBroadcast(deployer);
    Airdrop(airdrop).airdropETH{value: totalValue}(addresses, amounts);
  }
}
