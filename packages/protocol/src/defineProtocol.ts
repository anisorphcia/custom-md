import type { SemanticNodeDefinitions, SemanticProtocol } from "./types";

const NODE_NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;

export function defineProtocol<const TNodes extends SemanticNodeDefinitions>(config: {
  version: string;
  nodes: TNodes;
}): SemanticProtocol<TNodes> {
  if (!config.version.trim()) {
    throw new Error("Protocol version must not be empty");
  }

  for (const name of Object.keys(config.nodes)) {
    if (!NODE_NAME.test(name)) {
      throw new Error(`Invalid semantic node name: ${name}`);
    }
  }

  return Object.freeze({
    version: config.version,
    nodes: Object.freeze({ ...config.nodes }) as TNodes,
  });
}
