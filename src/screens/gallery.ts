import { content } from "../content/content.ts";

const READY = new Set(["predict", "mcq", "fill", "spot_bug"]);
const topicOrder = new Map(content.topics.map((topic) => [topic.id, topic.order]));

/** Cards the gallery can show, in course order. */
export const galleryCards = content.cards
  .filter((card) => READY.has(card.type))
  .sort((a, b) => (topicOrder.get(a.topic) ?? 0) - (topicOrder.get(b.topic) ?? 0));
