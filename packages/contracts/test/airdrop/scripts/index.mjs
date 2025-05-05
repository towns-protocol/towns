import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { readFileSync } from "fs";
// (1)
const json = JSON.parse(
  readFileSync(new URL("../../../in/condition-0.json", import.meta.url)),
);

const values = [];

for (const condition of json.conditions) {
  values.push([condition.account, condition.amount]);
}

// (2)
const tree = StandardMerkleTree.of(values, ["address", "uint256"]);

// (3)
console.log(tree.root);
