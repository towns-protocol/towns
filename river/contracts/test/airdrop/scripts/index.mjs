import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

// (1)
const values = [
  ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "1000000000000000000"],
  ["0x2FaC60B7bCcEc9b234A2f07448D3B2a045d621B9", "1000000000000000000"],
  ["0xa9a6512088904fbaD2aA710550B57c29ee0092c4", "1000000000000000000"],
  ["0x86312a65B491CF25D9D265f6218AB013DaCa5e19", "1000000000000000000"],
];

// (2)
const tree = StandardMerkleTree.of(values, ["address", "uint256"]);

// (3)
console.log(tree.root);
