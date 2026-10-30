import { content } from "../content/content.ts";

const topicOrder = new Map(content.topics.map((topic) => [topic.id, topic.order]));

/** Every card, in course order. */
export const galleryCards = content.cards.sort(
  (a, b) => (topicOrder.get(a.topic) ?? 0) - (topicOrder.get(b.topic) ?? 0),
);
