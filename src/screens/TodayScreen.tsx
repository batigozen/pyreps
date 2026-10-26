import { Link } from "react-router";
import Icon from "../components/Icon.tsx";
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
    </>
  );
}
