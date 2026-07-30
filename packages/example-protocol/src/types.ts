import type { InferNodeAttributes } from "@semantic-md/protocol";
import type { demoProtocol } from "./protocol";

export type DemoProtocol = typeof demoProtocol;
export type IncreaseAttributes = InferNodeAttributes<DemoProtocol, "increase">;
export type DecreaseAttributes = InferNodeAttributes<DemoProtocol, "decrease">;
export type StatusAttributes = InferNodeAttributes<DemoProtocol, "status">;
export type RiskAttributes = InferNodeAttributes<DemoProtocol, "risk">;
export type CitationAttributes = InferNodeAttributes<DemoProtocol, "citation">;
export type ActionAttributes = InferNodeAttributes<DemoProtocol, "action">;
