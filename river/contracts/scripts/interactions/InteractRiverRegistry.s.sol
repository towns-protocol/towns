// SPDX-License-Identifier: Apache-2.0
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
    string url;
    NodeStatus status;
  }

  Node[] nodes;

  function __interact(uint256 pk, address) public override {
    address registry = getDeployment("riverRegistry");
    _addInitialNodes();

    for (uint256 i = 0; i < nodes.length; i++) {
      vm.broadcast(pk);
      NodeRegistry(registry).registerNode(
        nodes[i].nodeAddress,
        nodes[i].url,
        nodes[i].status
      );
    }
  }

  function _addInitialNodes() internal {
    nodes.push(
      Node(
        0xBF2Fe1D28887A0000A1541291c895a26bD7B1DdD,
        "https://river1.nodes.gamma.towns.com",
        NodeStatus.Operational
      )
    );

    nodes.push(
      Node(
        0x43EaCe8E799497f8206E579f7CCd1EC41770d099,
        "https://river2.nodes.gamma.towns.com",
        NodeStatus.Operational
      )
    );

    nodes.push(
      Node(
        0x4E9baef70f7505fda609967870b8b489AF294796,
        "https://river3.nodes.gamma.towns.com",
        NodeStatus.Operational
      )
    );

    nodes.push(
      Node(
        0xae2Ef76C62C199BC49bB38DB99B29726bD8A8e53,
        "https://river4.nodes.gamma.towns.com",
        NodeStatus.Operational
      )
    );

    nodes.push(
      Node(
        0xC4f042CD5aeF82DB8C089AD0CC4DD7d26B2684cB,
        "https://river5.nodes.gamma.towns.com",
        NodeStatus.Operational
      )
    );

    nodes.push(
      Node(
        0x9BB3b35BBF3FA8030cCdb31030CF78039A0d0D9b,
        "https://river6.nodes.gamma.towns.com",
        NodeStatus.Operational
      )
    );

    nodes.push(
      Node(
        0x582c64BA11bf70E0BaC39988Cd3Bf0b8f40BDEc4,
        "https://river7.nodes.gamma.towns.com",
        NodeStatus.Operational
      )
    );

    nodes.push(
      Node(
        0x9df6e5F15ec682ca58Df6d2a831436973f98fe60,
        "https://river8.nodes.gamma.towns.com",
        NodeStatus.Operational
      )
    );

    nodes.push(
      Node(
        0xB79FaCbFC07Bff49cD2e2971305Da0DF7aCa9bF8,
        "https://river9.nodes.gamma.towns.com",
        NodeStatus.Operational
      )
    );

    nodes.push(
      Node(
        0xA278267f396a317c5Bb583f47F7f2792Bc00D3b3,
        "https://river10.nodes.gamma.towns.com",
        NodeStatus.Operational
      )
    );
  }
}
