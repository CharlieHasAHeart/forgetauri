import type { ContextPacket } from "../../contracts/context.js";
import { serializeContextPacket } from "../../contracts/context.js";

export const layoutPacket = (packet: ContextPacket): string => serializeContextPacket(packet);
