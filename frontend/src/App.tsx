import { Routes, Route } from 'react-router';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './components/ui/Toast';
import { PendingApproval } from './components/PendingApproval';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Play from './pages/Play';
import Editor from './pages/Editor';
import Admin from './pages/Admin';
import Settings from './pages/Settings';
import ApiKeySettings from './pages/ApiKeySettings';

function AppRoutes() {
  const { user } = useAuth();

  // 로그인했지만 pending 상태 → 승인 대기 화면 (로그인/회원가입 페이지 제외)
  if (user?.role === 'pending') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="*" element={<PendingApproval />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/play/:storyId?" element={<Play />} />
      <Route path="/editor/:storyId?" element={<Editor />} />
      <Route path="/admin/*" element={<Admin />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/apikey" element={<ApiKeySettings />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
