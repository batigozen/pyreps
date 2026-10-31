import { Navigate, Route, Routes } from "react-router";
import TodayScreen from "./screens/TodayScreen.tsx";
import TopicsScreen from "./screens/TopicsScreen.tsx";
import ProjectsScreen from "./screens/ProjectsScreen.tsx";
import PlaygroundScreen from "./screens/PlaygroundScreen.tsx";
import StatsScreen from "./screens/StatsScreen.tsx";
import SettingsScreen from "./screens/SettingsScreen.tsx";
import GalleryScreen from "./screens/GalleryScreen.tsx";
import GalleryCardScreen from "./screens/GalleryCardScreen.tsx";
import SessionScreen from "./screens/SessionScreen.tsx";
import TopicScreen from "./screens/TopicScreen.tsx";
import ProjectScreen from "./screens/ProjectScreen.tsx";

export default function AppRoutes() {
  return (
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
  );
}
