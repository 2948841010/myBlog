import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Search, X } from 'lucide-react';
import { SITE } from '../../config/site.js';
import { useUI } from '../../store/index.jsx';
import { useLockBodyScroll } from '../../lib/hooks.js';
import { ThemeToggle } from '../ui/ThemeToggle.jsx';
import { NavList } from './Sidebar.jsx';

/** 移动端顶栏 + 抽屉导航（<1024px） */
export function MobileHeader() {
  const { drawerOpen, openDrawer, closeDrawer, openPalette } = useUI();
  useLockBodyScroll(drawerOpen);

  return (
    <>
      <header className="mobile-header">
        <button
          type="button"
          className="btn btn--icon"
          onClick={openDrawer}
          aria-label="打开导航菜单"
        >
          <Menu size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <Link to="/" className="mobile-header__title">
          {SITE.name}
          <span className="text-dim" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            {' '}
            / Agent 笔记
          </span>
        </Link>
        <span className="mobile-header__spacer" />
        <button
          type="button"
          className="btn btn--icon"
          onClick={openPalette}
          aria-label="搜索"
        >
          <Search size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <ThemeToggle size="sm" />
      </header>

      <AnimatePresence>
        {drawerOpen ? (
          <div className="drawer" role="dialog" aria-modal="true" aria-label="导航菜单">
            <motion.div
              className="drawer__scrim"
              onClick={closeDrawer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24 }}
            />
            <motion.nav
              className="drawer__panel"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="row row--between">
                <span className="row" style={{ gap: 10 }}>
                  <span className="sidebar__mark" aria-hidden="true">
                    {SITE.initial}
                  </span>
                  <span className="sidebar__brandtext">
                    <span className="sidebar__name">{SITE.name}</span>
                    <span className="sidebar__role">Agent 开发笔记</span>
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn--icon"
                  onClick={closeDrawer}
                  aria-label="关闭导航菜单"
                >
                  <X size={18} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>

              <NavList onNavigate={closeDrawer} />

              <div className="sidebar__foot">
                <div className="status-widget">
                  <span className="status-widget__dot" aria-hidden="true" />
                  <span className="status-widget__text">
                    <span className="status-widget__title">博客刚开张</span>
                    <span className="status-widget__sub">第一篇正在写</span>
                  </span>
                </div>
                <div className="row row--between">
                  <ThemeToggle size="sm" />
                  <span className="sidebar__copyright">© 2026 {SITE.name}</span>
                </div>
              </div>
            </motion.nav>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
