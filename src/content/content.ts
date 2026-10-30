import raw from "../generated/content.json";
import type { Card, Content } from "./schema.ts";

// Built and checked by scripts/build_content.ts, so it is trusted here.
export const content = raw as unknown as Content;

export const cardsById: ReadonlyMap<string, Card> = new Map(
  content.cards.map((card) => [card.id, card]),
);
