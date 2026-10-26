import { Link } from "react-router";
import Icon from "../components/Icon.tsx";
import Placeholder from "../components/Placeholder.tsx";
import ScreenHeader from "../components/ScreenHeader.tsx";

export default function SettingsScreen() {
  return (
    <>
      <ScreenHeader
        title="Settings"
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
      <Placeholder>Daily goals, topics and backups will go here. Coming soon.</Placeholder>
    </>
  );
}
