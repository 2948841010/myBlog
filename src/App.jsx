import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.jsx';
import Home from './pages/Home.jsx';
import Posts from './pages/Posts.jsx';
import PostDetail from './pages/PostDetail.jsx';
import Series from './pages/Series.jsx';
import About from './pages/About.jsx';
import NotFound from './pages/NotFound.jsx';

/**
 * 路由表：所有页面都嵌在唯一的 AppShell 之下，
 * 页面组件只渲染主内容区（不得再声明导航 / 页脚）。
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="posts" element={<Posts />} />
        <Route path="posts/:slug" element={<PostDetail />} />
        <Route path="series" element={<Series />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
