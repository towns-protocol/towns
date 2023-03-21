// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {ScriptUtils} from "./utils/ScriptUtils.sol";
import {Member} from "contracts/src/core/tokens/Member.sol";

contract DeployMember is ScriptUtils {
  Member private member;

  function setUp() external {
    string memory name = "Council Member";
    string memory symbol = "MEMBER";
    string
      memory baseURI = "https://bafybeihuygd5wm43kmxl4pocbv5uchdrkimhfwk75qgbmtlrqsy2bwwijq.ipfs.nftstorage.link/metadata/";

    vm.startBroadcast();
    member = new Member(name, symbol, baseURI, "");
    vm.stopBroadcast();
  }
}
