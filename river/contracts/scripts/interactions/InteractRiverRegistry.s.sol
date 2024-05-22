// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

//interfaces

//libraries

//contracts
import {Interaction} from "../common/Interaction.s.sol";
import {NodeRegistry} from "contracts/src/river/registry/facets/node/NodeRegistry.sol";
import {NodeStatus} from "contracts/src/river/registry/libraries/RegistryStorage.sol";

contract InteractRiverRegistry is Interaction {
  struct Node {
    address nodeAddress;
    NodeStatus status;
  }

  Node[] nodes;

  function __interact(address deployer) public override {
    address registry = getDeployment("riverRegistry");
    _addInitialNodes();

    uint numNodes = vm.envOr("NUM_NODES", uint(10));

    for (uint256 i = 0; i < numNodes; i++) {
      vm.broadcast(deployer);

      NodeRegistry(registry).registerNode(
        nodes[i].nodeAddress,
        _getNodeUrl(i + 1),
        nodes[i].status
      );
    }
  }

  function _getNodeUrl(
    uint256 nodeNumber
  ) internal view returns (string memory) {
    // By default, nodes register under nodes.gamma.towns.com
    // However, other suffixes can be set using the NODE_URL_SUFFIX env variable
    string memory nodeUrlSuffix = vm.envOr(
      "NODE_URL_SUFFIX",
      string(".nodes.gamma.towns.com")
    );

    // By default, node urls are incremented via the host name:
    // i.e river1.nodes.gamma.towns.com, river2.nodes.gamma.towns.com
    // However, if the env variable NODE_URL_INCREMENT_VIA_PORT is set to true,
    // the node urls will be incremented via the port number:
    // i.e river.nodes.gamma.towns.com:3001, river.nodes.gamma.towns.com:3002
    bool nodeUrlIncrementViaPort = vm.envOr(
      "NODE_URL_INCREMENT_VIA_PORT",
      false
    );

    if (nodeUrlIncrementViaPort) {
      uint nodeUrlInitialPort = vm.envOr("NODE_URL_INITIAL_PORT", uint(10000));
      uint nodeUrlPort = nodeUrlInitialPort + nodeNumber;

      return
        string.concat(
          "https://river",
          nodeUrlSuffix,
          ":",
          vm.toString(nodeUrlPort)
        );
    } else {
      return
        string.concat("https://river", vm.toString(nodeNumber), nodeUrlSuffix);
    }
  }

  function _addInitialNodes() internal {
    nodes.push(
      Node(0xBF2Fe1D28887A0000A1541291c895a26bD7B1DdD, NodeStatus.Operational)
    );

    nodes.push(
      Node(0x43EaCe8E799497f8206E579f7CCd1EC41770d099, NodeStatus.Operational)
    );

    nodes.push(
      Node(0x4E9baef70f7505fda609967870b8b489AF294796, NodeStatus.Operational)
    );

    nodes.push(
      Node(0xae2Ef76C62C199BC49bB38DB99B29726bD8A8e53, NodeStatus.Operational)
    );

    nodes.push(
      Node(0xC4f042CD5aeF82DB8C089AD0CC4DD7d26B2684cB, NodeStatus.Operational)
    );

    nodes.push(
      Node(0x9BB3b35BBF3FA8030cCdb31030CF78039A0d0D9b, NodeStatus.Operational)
    );

    nodes.push(
      Node(0x582c64BA11bf70E0BaC39988Cd3Bf0b8f40BDEc4, NodeStatus.Operational)
    );

    nodes.push(
      Node(0x9df6e5F15ec682ca58Df6d2a831436973f98fe60, NodeStatus.Operational)
    );

    nodes.push(
      Node(0xB79FaCbFC07Bff49cD2e2971305Da0DF7aCa9bF8, NodeStatus.Operational)
    );

    nodes.push(
      Node(0xA278267f396a317c5Bb583f47F7f2792Bc00D3b3, NodeStatus.Operational)
    );
  }
}
