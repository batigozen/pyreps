import { Link } from "react-router";
import Icon from "../components/Icon.tsx";
import ScreenHeader from "../components/ScreenHeader.tsx";
import { galleryCards } from "./gallery.ts";

// Temporary screen to try every card. Phase 4 replaces it with real sessions.
export default function GalleryScreen() {
  return (
    <>
      <ScreenHeader
        title="Card gallery"
        leading={
          <Link
            to="/"
            aria-label="Back to Today"
            className="-ml-2 flex size-11 items-center justify-center rounded-xl text-accent"
          >
            <Icon name="back" />
          </Link>
        }
      />
      <p className="mb-4 text-muted">Try every card. Nothing is saved yet.</p>
      <ul className="flex flex-col gap-2">
        {galleryCards.map((card) => (
          <li key={card.id}>
            <Link
              to={`/gallery/${card.id}`}
              className="flex min-h-12 flex-col justify-center rounded-xl border border-border bg-surface px-4 py-2"
            >
              <span className="font-mono text-[15px] break-all">{card.id}</span>
              <span className="text-[15px] text-muted">
                {card.topic} · {card.type.replace("_", " ")} · level {card.level}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
