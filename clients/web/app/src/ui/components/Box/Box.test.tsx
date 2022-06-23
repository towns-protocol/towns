import React from "react";
import TestRenderer from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { atoms } from "ui/styles/atoms.css";
import { toJsonTree } from "utils/test_util";
import { Box } from "./Box";

describe("Box", () => {
  it("should render", () => {
    const component = TestRenderer.create(<Box />);
    const tree = toJsonTree(component);
    expect(tree.type).toBe("div");
  });

  it("should be rendered as another HTMLElement", () => {
    const component = TestRenderer.create(<Box as="main" />);
    const tree = toJsonTree(component);
    expect(tree.type).toBe("main");
  });

  it("should display with default properties", () => {
    const component = TestRenderer.create(<Box />);
    const tree = toJsonTree(component);
    expect(tree.props.className).toContain(
      atoms({
        display: "flex",
      }),
    );
    expect(tree.props.className).toContain(
      atoms({
        flexDirection: "column",
      }),
    );
  });
  it("should display classes correctly", () => {
    const component = TestRenderer.create(<Box padding="lg" color="accent" />);
    const tree = toJsonTree(component);
    expect(tree.props.className).toContain(
      atoms({
        color: "accent",
      }),
    );
    expect(tree.props.className).toContain(atoms({ padding: "lg" }));
  });

  it("should display shorthands correctly", () => {
    const component = TestRenderer.create(<Box padding border grow shrink />);
    const tree = toJsonTree(component);
    expect(tree.props.className).toContain(atoms({ padding: "md" }));
    expect(tree.props.className).toContain(atoms({ border: "default" }));
    expect(tree.props.className).toContain(atoms({ flexGrow: "x1" }));
    expect(tree.props.className).toContain(atoms({ flexShrink: "x1" }));
  });

  it("should display shorthands correctly", () => {
    const component = TestRenderer.create(<Box borderBottom />);
    const tree = toJsonTree(component);
    expect(tree.props.className).toContain(atoms({ borderBottom: "default" }));
  });

  it("should display exclusive shorthands correctly", () => {
    const component = TestRenderer.create(<Box centerContent />);
    const tree = toJsonTree(component);
    expect(tree.props.className).toContain(atoms({ alignItems: "center" }));
    expect(tree.props.className).toContain(atoms({ justifyContent: "center" }));
  });
});
