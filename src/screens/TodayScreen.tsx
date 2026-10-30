import { Link } from "react-router";
import Icon from "../components/Icon.tsx";
import PythonStatusBadge from "../components/PythonStatusBadge.tsx";
import Placeholder from "../components/Placeholder.tsx";
import ScreenHeader from "../components/ScreenHeader.tsx";

export default function TodayScreen() {
  return (
    <>
      <ScreenHeader
        title="Today"
        action={
          <Link
            to="/settings"
            aria-label="Settings"
            className="flex size-11 items-center justify-center rounded-xl text-muted"
          >
            <Icon name="settings" />
          </Link>
        }
      />
      <Placeholder>Your daily reps will show here. Coming soon.</Placeholder>
      <div className="mt-4">
        <PythonStatusBadge />
      </div>
      <Link
        to="/gallery"
        className="mt-6 flex min-h-12 items-center justify-center rounded-xl border-2 border-accent px-4 font-bold text-accent"
      >
        Card gallery (for testing)
      </Link>
    </>
  );
}
