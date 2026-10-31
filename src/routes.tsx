import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import TodayScreen from "./screens/TodayScreen.tsx";

// Today is the first screen, so it ships in the main bundle. The others load when
// first opened; the service worker has them cached, so this also works offline.
const TopicsScreen = lazy(() => import("./screens/TopicsScreen.tsx"));
const TopicScreen = lazy(() => import("./screens/TopicScreen.tsx"));
const SessionScreen = lazy(() => import("./screens/SessionScreen.tsx"));
const ProjectsScreen = lazy(() => import("./screens/ProjectsScreen.tsx"));
const ProjectScreen = lazy(() => import("./screens/ProjectScreen.tsx"));
const PlaygroundScreen = lazy(() => import("./screens/PlaygroundScreen.tsx"));
const StatsScreen = lazy(() => import("./screens/StatsScreen.tsx"));
const SettingsScreen = lazy(() => import("./screens/SettingsScreen.tsx"));
const GalleryScreen = lazy(() => import("./screens/GalleryScreen.tsx"));
const GalleryCardScreen = lazy(() => import("./screens/GalleryCardScreen.tsx"));

export default function AppRoutes() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Routes>
        <Route path="/" element={<TodayScreen />} />
        <Route path="/topics" element={<TopicsScreen />} />
        <Route path="/topics/:topicId" element={<TopicScreen />} />
        <Route path="/session" element={<SessionScreen />} />
        <Route path="/projects" element={<ProjectsScreen />} />
        <Route path="/projects/:projectId" element={<ProjectScreen />} />
        <Route path="/playground" element={<PlaygroundScreen />} />
        <Route path="/stats" element={<StatsScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/gallery" element={<GalleryScreen />} />
        <Route path="/gallery/:cardId" element={<GalleryCardScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
