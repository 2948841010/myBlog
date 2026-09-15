import { Link, NavLink } from 'react-router-dom';
import { Search } from 'lucide-react';
import { NAV_ITEMS, SITE } from '../../config/site.js';
import { useUI } from '../../store/index.jsx';
import { ThemeToggle } from '../ui/ThemeToggle.jsx';
import { useAsync } from '../../lib/useAsync.js';
import { fetchStats } from '../../api/index.js';
import { Dock } from '../fx/PointerFx.jsx';
import { HyperText } from '../fx/TextFx.jsx';

/** 导航列表（侧边栏与移动端抽屉共用同一份 NAV_ITEMS 配置，杜绝结构漂移）
 *  外层包 Dock：指针靠近时逐项轻微放大右移（macOS Dock 的纵向版），
 *  不改动导航结构、顺序与高亮规则。 */
export function NavList({ onNavigate, counts }) {
  return (
    <nav className="sidebar__group" aria-label="主导航">
      <div className="sidebar__label">Navigate</div>
      <Dock>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.key}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              <span>{item.label}</span>
              {counts?.[item.key] ? (
                <span className="nav-item__count">{counts[item.key]}</span>
              ) : null}
            </NavLink>
          );
        })}
      </Dock>
    </nav>
  );
}

/** 侧边栏（≥1024px 固定显示，宽度 --sidebar-w） */
export function Sidebar() {
  const { openPalette } = useUI();
  // useAsync 的 data 是接口响应体 { code, data }，这里取内层统计对象
  const { data: statsRes } = useAsync(fetchStats, []);
  const stats = statsRes?.data ?? null;

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar__brand">
        <span className="sidebar__mark" aria-hidden="true">
          {SITE.initial}
        </span>
        <span className="sidebar__brandtext">
          <HyperText text={SITE.name} className="sidebar__name" />
          <span className="sidebar__role">Agent 开发笔记</span>
        </span>
      </Link>

      <button
        type="button"
        className="btn btn--ghost"
        onClick={openPalette}
        aria-label="打开搜索面板"
        style={{ justifyContent: 'flex-start', gap: 10 }}
      >
        <Search size={16} strokeWidth={1.75} aria-hidden="true" />
        <span className="text-sub" style={{ fontSize: 13 }}>
          搜索文章与系列
        </span>
        <kbd style={{ marginLeft: 'auto' }}>⌘K</kbd>
      </button>

      <NavList counts={{ posts: stats?.postCount }} />

      <div className="sidebar__foot">
        <div className="status-widget">
          <span className="status-widget__dot" aria-hidden="true" />
          <span className="status-widget__text">
            <span className="status-widget__title">
              {stats && stats.postCount === 0 ? '博客刚开张' : '持续更新中'}
            </span>
            <span className="status-widget__sub">
              {!stats
                ? '正在同步…'
                : stats.postCount === 0
                  ? '第一篇正在写'
                  : `${stats.seriesCount} 个系列 · ${stats.postCount} 篇`}
            </span>
          </span>
        </div>

        <div className="sidebar__meta">
          <ThemeToggle size="sm" />
          {SITE.socials.slice(0, 2).map((s) => {
            const Icon = s.icon;
            return (
              <a
                key={s.key}
                className="btn btn--icon btn--sm"
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                title={`${s.label} · ${s.handle}`}
              >
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
              </a>
            );
          })}
          <span className="grow" />
        </div>

        <div className="sidebar__copyright">
          © 2026 {SITE.name}
          <br />
          React + Vite · 纯前端
        </div>
      </div>
    </aside>
  );
}
