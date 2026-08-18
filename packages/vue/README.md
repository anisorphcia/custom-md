# `@semantic-md/vue`

Semantic Markdown 的 Vue 3 renderer 和流式 composable。

```bash
pnpm add @semantic-md/protocol @semantic-md/vue zod vue
```

```vue
<script setup lang="ts">
import { defineProtocol } from "@semantic-md/protocol";
import { SemanticMarkdown } from "@semantic-md/vue";
import type { SemanticComponentMap } from "@semantic-md/vue";
import { defineComponent, h, type PropType } from "vue";
import { z } from "zod";

const protocol = defineProtocol({
  version: "1.0.0",
  nodes: {
    status: {
      kind: "inline",
      schema: z.object({ value: z.enum(["pending", "done"]) }),
      fallback: "children",
    },
  },
});

const components: SemanticComponentMap = {
  status: defineComponent({
    props: {
      attributes: {
        type: Object as PropType<Record<string, unknown>>,
        required: true,
      },
    },
    setup(props, { slots }) {
      return () => h("span", { "data-status": props.attributes.value }, slots.default?.());
    },
  }),
};
</script>

<template>
  <SemanticMarkdown
    content=":status[已完成]{value=&quot;done&quot;}"
    :protocol="protocol"
    :components="components"
  />
</template>
```

流式场景使用 `useSemanticMarkdown({ protocol })`，逐段调用 `push(text)`，结束时调用
`finish()`，再将 `document` 传给 `<SemanticMarkdown>`。

参阅[自定义 Protocol 接入指南](../../docs/custom-protocol.md)和
[公共 API](../../docs/api.md)。
