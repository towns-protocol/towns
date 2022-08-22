import { EditorConfig, SerializedTextNode, TextNode } from "lexical";
import { vars } from "ui/styles/vars.css";

export class AnnotationNode extends TextNode {
  static getType(): string {
    return "colored";
  }

  static clone(node: AnnotationNode): AnnotationNode {
    return new AnnotationNode(node.__text, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    element.style.color = vars.color.foreground.gray2;
    element.style.fontSize = vars.fontSize.sm;
    return element;
  }

  updateDOM(
    prevNode: AnnotationNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const isUpdated = super.updateDOM(prevNode, dom, config);

    return isUpdated;
  }

  static importJSON(serializedNode: SerializedTextNode): AnnotationNode {
    const node = $createAnnotationNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    return node;
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: this.getType(),
      version: 1,
    };
  }
}

export function $createAnnotationNode(text: string): AnnotationNode {
  return new AnnotationNode(text);
}
