import { useLocation } from "react-router";
import AppRoutes from "./routes.tsx";
import BottomNav from "./components/BottomNav.tsx";
import TextScale from "./components/TextScale.tsx";
import UpdateToast from "./components/UpdateToast.tsx";

export default function App() {
  // The card player is full screen: no tab bar to tap by mistake.
  const inSession = useLocation().pathname === "/session";
  return (
    <div className="mx-auto flex min-h-dvh max-w-[640px] flex-col">
      <TextScale />
      <main className={`app-main flex-1 ${inSession ? "no-nav" : ""}`}>
        <AppRoutes />
      </main>
      {!inSession && <BottomNav />}
      <UpdateToast paused={inSession} />
    </div>
  );
}
