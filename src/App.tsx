import AppRoutes from "./routes.tsx";
import BottomNav from "./components/BottomNav.tsx";
import UpdateToast from "./components/UpdateToast.tsx";

export default function App() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[640px] flex-col">
      <main className="app-main flex-1">
        <AppRoutes />
      </main>
      <BottomNav />
      <UpdateToast />
    </div>
  );
}
