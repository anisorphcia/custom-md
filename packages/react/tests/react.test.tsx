import { createStreamingMarkdownSession } from "@semantic-md/core";
import { defineProtocol } from "@semantic-md/protocol";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { type SemanticComponentProps, SemanticMarkdown, useSemanticMarkdown } from "../src";

const protocol = defineProtocol({
  version: "1",
  nodes: {
    action: {
      kind: "inline",
      schema: z.object({ name: z.string() }),
      fallback: "children",
      renderPending: true,
    },
  },
});

describe("SemanticMarkdown", () => {
  it("renders Markdown and safe semantic components", () => {
    function Action(props: SemanticComponentProps) {
      return (
        <button type="button" onClick={() => props.context.requestAction({ name: "test" })}>
          {props.children}
        </button>
      );
    }
    const onAction = vi.fn();
    render(
      <SemanticMarkdown
        content={'# Hello\n\n:action[Run]{name="run"}'}
        protocol={protocol}
        components={{ action: Action }}
        onAction={onAction}
      />,
    );
    expect(screen.getByRole("heading", { name: "Hello" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(onAction).toHaveBeenCalledWith({ name: "test" });
  });

  it("falls back to children for unknown nodes", () => {
    render(<SemanticMarkdown content=":unknown[Visible]{value=1}" protocol={protocol} />);
    expect(screen.getByText("Visible")).toBeTruthy();
  });

  it("preserves custom component instances when a node stabilizes", () => {
    let mounts = 0;
    let unmounts = 0;
    function Action(props: SemanticComponentProps) {
      useEffect(() => {
        mounts += 1;
        return () => {
          unmounts += 1;
        };
      }, []);
      return <span>{props.children}</span>;
    }
    const session = createStreamingMarkdownSession({ protocol, batchInterval: 0 });
    session.push(':action[Run]{name="run"}');
    const view = render(
      <SemanticMarkdown
        document={session.getSnapshot()}
        protocol={protocol}
        components={{ action: Action }}
      />,
    );
    session.push("\n\n");
    view.rerender(
      <SemanticMarkdown
        document={session.getSnapshot()}
        protocol={protocol}
        components={{ action: Action }}
      />,
    );
    expect(mounts).toBe(1);
    expect(unmounts).toBe(0);
  });

  it("applies batched session updates through the streaming hook", () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useSemanticMarkdown({ protocol, batchInterval: 16 }));

      act(() => {
        result.current.push("# Bat");
        result.current.push("ched");
      });
      expect(result.current.document.children).toHaveLength(0);

      act(() => {
        vi.advanceTimersByTime(16);
      });
      expect(result.current.status).toBe("streaming");
      expect(JSON.stringify(result.current.document)).toContain("Batched");
    } finally {
      vi.useRealTimers();
    }
  });
});
