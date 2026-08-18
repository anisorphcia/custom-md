import type { SemanticNodeDefinition, SemanticNodeDefinitions, SemanticProtocol } from "./types";

export function getNodeDefinition<TNodes extends SemanticNodeDefinitions, TName extends string>(
  protocol: SemanticProtocol<TNodes>,
  name: TName,
): SemanticNodeDefinition | undefined {
  return protocol.nodes[name];
}

export class SemanticRegistry<TNodes extends SemanticNodeDefinitions = SemanticNodeDefinitions> {
  readonly #protocol: SemanticProtocol<TNodes>;

  public constructor(protocol: SemanticProtocol<TNodes>) {
    this.#protocol = protocol;
  }

  public get(name: string): SemanticNodeDefinition | undefined {
    return getNodeDefinition(this.#protocol, name);
  }

  public has(name: string): boolean {
    return this.get(name) !== undefined;
  }

  public names(): string[] {
    return Object.keys(this.#protocol.nodes);
  }
}
