import { defineProtocol } from "@semantic-md/protocol";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, onMounted, onUnmounted } from "vue";
import { z } from "zod";
import { SemanticMarkdown, useSemanticMarkdown } from "../src";

const protocol = defineProtocol({
  version: "1",
  nodes: {
    action: {
      kind: "inline",
      schema: z.object({ name: z.string() }),
      fallback: "children",
      renderPending: true,
    },
    report: {
      kind: "container",
      schema: z.object({ label: z.string() }),
      fallback: "blockquote",
      renderPending: true,
    },
  },
});

describe("SemanticMarkdown", () => {
  it("renders Markdown, custom components, and action events", async () => {
    const Action = defineComponent({
      props: ["context"],
      setup(props, { slots }) {
        return () =>
          h(
            "button",
            {
              onClick: () => props.context.requestAction({ name: "test" }),
            },
            slots.default?.(),
          );
      },
    });
    const wrapper = mount(SemanticMarkdown, {
      props: {
        content: '# Hello\n\n:action[Run]{name="run"}',
        protocol,
        components: { action: Action },
      },
    });
    expect(wrapper.get("h1").text()).toBe("Hello");
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("action")?.[0]).toEqual([{ name: "test" }]);
  });

  it("does not create anchors for dangerous links", () => {
    const wrapper = mount(SemanticMarkdown, {
      props: {
        content: "[visible](javascript:alert(1))",
        protocol,
      },
    });
    expect(wrapper.find("a").exists()).toBe(false);
    expect(wrapper.text()).toContain("visible");
  });

  it("preserves custom component instances for stable node IDs", async () => {
    let mounts = 0;
    let unmounts = 0;
    const Action = defineComponent({
      setup(_props, { slots }) {
        onMounted(() => {
          mounts += 1;
        });
        onUnmounted(() => {
          unmounts += 1;
        });
        return () => h("span", slots.default?.());
      },
    });
    const { createStreamingMarkdownSession } = await import("@semantic-md/core");
    const session = createStreamingMarkdownSession({ protocol, batchInterval: 0 });
    session.push(':action[Run]{name="run"}');
    const wrapper = mount(SemanticMarkdown, {
      props: {
        document: session.getSnapshot(),
        protocol,
        components: { action: Action },
      },
    });
    session.push("\n\n");
    await wrapper.setProps({ document: session.getSnapshot() });
    expect(mounts).toBe(1);
    expect(unmounts).toBe(0);
  });

  it("renders text fragments safely while a semantic container streams", async () => {
    const Report = defineComponent({
      setup(_props, { slots }) {
        return () => h("article", { class: "report" }, slots.default?.());
      },
    });
    const { createStreamingMarkdownSession } = await import("@semantic-md/core");
    const session = createStreamingMarkdownSession({ protocol, batchInterval: 0 });
    session.push(':::report{label="收入"}\n收入');
    const wrapper = mount(SemanticMarkdown, {
      props: {
        document: session.getSnapshot(),
        protocol,
        components: { report: Report },
      },
    });
    expect(wrapper.get("article").text()).toBe("收入");

    session.push("同比增长 12.5%\n:::");
    await wrapper.setProps({ document: session.getSnapshot() });
    expect(wrapper.get("article").text()).toContain("收入同比增长 12.5%");
  });

  it("applies batched session updates through the streaming composable", async () => {
    vi.useFakeTimers();
    try {
      const Host = defineComponent({
        setup() {
          const stream = useSemanticMarkdown({ protocol, batchInterval: 16 });
          return { stream };
        },
        render() {
          return h("div", JSON.stringify(this.stream.document.value));
        },
      });
      const wrapper = mount(Host);

      wrapper.vm.stream.push("# Bat");
      wrapper.vm.stream.push("ched");
      expect(wrapper.vm.stream.document.value.children).toHaveLength(0);

      vi.advanceTimersByTime(16);
      await nextTick();
      expect(wrapper.vm.stream.status.value).toBe("streaming");
      expect(JSON.stringify(wrapper.vm.stream.document.value)).toContain("Batched");
    } finally {
      vi.useRealTimers();
    }
  });

  it("resets composable state through the Session idle notification", () => {
    const Host = defineComponent({
      setup() {
        return { stream: useSemanticMarkdown({ protocol, batchInterval: 0 }) };
      },
      render() {
        return h("div");
      },
    });
    const wrapper = mount(Host);

    wrapper.vm.stream.push("# Before reset");
    expect(wrapper.vm.stream.status.value).toBe("streaming");

    wrapper.vm.stream.reset();
    expect(wrapper.vm.stream.status.value).toBe("idle");
    expect(wrapper.vm.stream.document.value.children).toHaveLength(0);
    expect(wrapper.vm.stream.diagnostics.value).toEqual([]);
  });

  it("disposes the Session when the composable scope unmounts", () => {
    const Host = defineComponent({
      setup() {
        return { stream: useSemanticMarkdown({ protocol, batchInterval: 16 }) };
      },
      render() {
        return h("div");
      },
    });
    const wrapper = mount(Host);
    const stream = wrapper.vm.stream;
    stream.push("pending");

    wrapper.unmount();

    expect(() => stream.push("after unmount")).toThrow("Cannot push after dispose()");
  });
});
