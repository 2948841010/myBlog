import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopProgressBar } from './TopProgressBar.jsx';
import { Sidebar } from './Sidebar.jsx';
import { MobileHeader } from './MobileHeader.jsx';
import { Footer } from './Footer.jsx';
import { CommandPalette } from '../blog/CommandPalette.jsx';
import { Atmosphere } from '../fx/Atmosphere.jsx';
import { CursorFollower } from '../fx/PointerFx.jsx';
import { RouteWipe } from '../fx/PageTransition.jsx';

/** 路由切换：回顶 / 定位锚点（页面数据是异步加载的，所以做几次重试） */
function RouteScroller() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return undefined;
    }

    const id = hash.slice(1);
    let tries = 0;
    let timer = 0;

    const attempt = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      tries += 1;
      if (tries < 8) timer = window.setTimeout(attempt, 160);
    };

    attempt();
    return () => window.clearTimeout(timer);
  }, [pathname, hash]);

  return null;
}

/**
 * 全站唯一应用外壳。
 * 侧边栏 / 顶栏 / 页脚 / 浮层都只在这里挂载一次，
 * 页面组件只渲染 <Outlet /> 的位置（即主内容区），不得再声明导航。
 */
export function AppShell() {
  const { pathname } = useLocation();

  return (
    <div className="app-shell">
      <Atmosphere />
      <TopProgressBar />
      <Sidebar />

      <div className="app-main">
        <MobileHeader />
        <RouteScroller />

        {/* key 变化触发一次性入场动画；页面内不自行包裹过渡容器 */}
        <div
          key={pathname}
          className="page-fade"
          style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
        >
          <Outlet />
        </div>

        <Footer />
      </div>

      <CommandPalette />
      <CursorFollower />
      <RouteWipe />
    </div>
  );
}
