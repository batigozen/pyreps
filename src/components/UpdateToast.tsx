import { useRegisterSW } from "virtual:pwa-register/react";
import Icon from "./Icon.tsx";

type Props = {
  /** During a session the message would cover the card's buttons, so it waits. */
  paused?: boolean;
};

// Tells the user when the app works offline, and when a new version is waiting.
export default function UpdateToast({ paused = false }: Props) {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  // The live region stays in the DOM so VoiceOver announces new text in it.
  return (
    <div role="status" className="toast fixed inset-x-0 z-20 mx-auto max-w-[640px] px-4">
      {!paused && (offlineReady || needRefresh) && (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2 pl-4 shadow-lg">
          <p className="flex-1">
            {needRefresh ? "A new version is ready." : "Ready. PyReps now works offline."}
          </p>
          {needRefresh && (
            <button
              type="button"
              onClick={() => void updateServiceWorker(true)}
              className="min-h-11 rounded-xl bg-accent px-4 font-bold text-accent-fg"
            >
              Reload
            </button>
          )}
          <button
            type="button"
            onClick={close}
            aria-label="Close message"
            className="flex size-11 items-center justify-center rounded-xl text-muted"
          >
            <Icon name="close" />
          </button>
        </div>
      )}
    </div>
  );
}
