import { createStreamingMarkdownSession } from "@semantic-md/core";
import { defineProtocol } from "@semantic-md/protocol";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { type ReactNode, StrictMode, useEffect, useLayoutEffect } from "react";
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

  it("keeps chunks pushed before the first passive effect", () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => {
        const stream = useSemanticMarkdown({ protocol, batchInterval: 16 });
        useLayoutEffect(() => {
          stream.push("# Initial");
        }, [stream.push]);
        return stream;
      });

      act(() => {
        vi.advanceTimersByTime(16);
      });
      expect(JSON.stringify(result.current.document)).toContain("Initial");
    } finally {
      vi.useRealTimers();
    }
  });

  it("resets hook state through the Session idle notification", () => {
    const { result } = renderHook(() => useSemanticMarkdown({ protocol, batchInterval: 0 }));

    act(() => {
      result.current.push("# Before reset");
    });
    expect(result.current.status).toBe("streaming");

    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe("idle");
    expect(result.current.document.children).toHaveLength(0);
    expect(result.current.diagnostics).toEqual([]);
  });

  it("recreates a disposed Session during Strict Mode effect replay", () => {
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;
    const { result } = renderHook(() => useSemanticMarkdown({ protocol, batchInterval: 0 }), {
      wrapper,
    });

    act(() => {
      result.current.push("# Strict Mode");
    });

    expect(result.current.status).toBe("streaming");
    expect(JSON.stringify(result.current.document)).toContain("Strict Mode");
  });

  it("disposes the Session when the hook unmounts", () => {
    const { result, unmount } = renderHook(() =>
      useSemanticMarkdown({ protocol, batchInterval: 16 }),
    );
    const push = result.current.push;
    act(() => {
      push("pending");
    });

    unmount();

    expect(() => push("after unmount")).toThrow("Cannot push after dispose()");
  });
});
