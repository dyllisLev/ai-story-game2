import { Routes, Route } from 'react-router';
import { AuthProvider } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './components/ui/Toast';
import Home from './pages/Home';
import Play from './pages/Play';
import Editor from './pages/Editor';
import Admin from './pages/Admin';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/play/:storyId?" element={<Play />} />
            <Route path="/editor/:storyId?" element={<Editor />} />
            <Route path="/admin/*" element={<Admin />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
