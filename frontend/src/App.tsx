import { lazy, Suspense } from "react";
import { Link, Route, Routes } from "react-router";
import { GameShell } from "@/components/GameShell";
import { LoadingScreen } from "@/components/States";
import LoginPage from "@/pages/Login";
import SignupPage from "@/pages/Signup";

const HomePage = lazy(() => import("@/pages/Home"));
const AvatarPage = lazy(() => import("@/pages/Avatar"));
const DashboardPage = lazy(() => import("@/pages/Dashboard"));
const MenuPage = lazy(() => import("@/pages/Menu"));
const StorylineMapPage = lazy(() => import("@/pages/StorylineMap"));
const LabPage = lazy(() => import("@/pages/Lab"));

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route element={<GameShell />}>
          <Route index element={<HomePage />} />
          <Route path="avatar" element={<AvatarPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="storylines/:slug" element={<StorylineMapPage />} />
          <Route path="labs/:slug" element={<LabPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="font-mono text-5xl font-black text-primary">404</p>
      <p className="mt-2 text-muted-foreground">This page is encrypted beyond recovery.</p>
      <Link to="/" className="mt-4 inline-block text-primary hover:underline">
        Return home
      </Link>
    </div>
  );
}
