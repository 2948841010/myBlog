import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.jsx';
import Home from './pages/Home.jsx';
import Posts from './pages/Posts.jsx';
import PostDetail from './pages/PostDetail.jsx';
import Series from './pages/Series.jsx';
import About from './pages/About.jsx';
import NotFound from './pages/NotFound.jsx';

/**
 * 写作台按开关动态引入。
 *
 * 这里刻意直接写 __STUDIO_ENABLED__（由 vite.config.js 的 define 注入字面量），
 * 而不是从 features.js 里取 STUDIO_ENABLED —— 判断和 import 处在同一个模块里，
 * 打包器在分块之前就能把三元表达式折叠掉，关闭时连 chunk 都不会产出。
 * 跨模块引用时折叠发生在压缩阶段（分块之后），会留下没人引用的孤儿文件。
 *
 * · 开发模式（.env.development 里 VITE_ENABLE_STUDIO=on）→ true，正常注册路由
 * · 生产构建 → false，分支与 import 一并消失，线上访问 /studio 会落到 404 页
 */
const Studio = __STUDIO_ENABLED__ ? lazy(() => import('./pages/Studio.jsx')) : null;

/**
 * 路由表。
 * 站点页面都嵌在唯一的 AppShell 之下，页面组件只渲染主内容区
 *（不得再声明导航 / 页脚）。
 * 例外是写作台：#/studio 刻意不套 AppShell —— 它没有导航、页脚和氛围动效，
 * 也不出现在任何导航入口里，只有手输地址才会进入。
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

      {Studio ? (
        <Route
          path="studio"
          element={
            <Suspense fallback={null}>
              <Studio />
            </Suspense>
          }
        />
      ) : null}
    </Routes>
  );
}
