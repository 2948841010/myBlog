import { Link } from 'react-router-dom';
import { NAV_ITEMS, SITE } from '../../config/site.js';
import { useAsync } from '../../lib/useAsync.js';
import { fetchSeries } from '../../api/index.js';

/** 全站页脚（由 AppShell 统一渲染，页面不得重复声明） */
export function Footer() {
  // useAsync 的 data 是接口响应体 { code, data }，这里取内层数组
  const { data: seriesRes } = useAsync(fetchSeries, []);
  const seriesList = seriesRes?.data ?? null;

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div>
          <div className="footer__brand">
            {SITE.name}
            <span className="text-accent"> / </span>
            Agent 开发连载
          </div>
          <p className="footer__desc">{SITE.description}</p>
          <div className="tag-row" style={{ marginTop: 16 }}>
            {SITE.socials.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.key}
                  className="tag"
                  href={s.href}
                  target={s.href.startsWith('http') ? '_blank' : undefined}
                  rel={s.href.startsWith('http') ? 'noreferrer' : undefined}
                >
                  <Icon size={12} strokeWidth={1.75} aria-hidden="true" />
                  {s.label}
                </a>
              );
            })}
          </div>
        </div>

        <div>
          <div className="footer__coltitle">Navigation</div>
          <ul className="footer__list">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link className="footer__link" to={item.to}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link className="footer__link" to="/posts?sort=popular">
                热门文章
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="footer__coltitle">连载系列</div>
          <ul className="footer__list">
            {seriesList && seriesList.length
              ? seriesList.map((s) => (
                  <li key={s.id}>
                    <Link className="footer__link" to={`/series#${s.slug}`}>
                      {s.title}
                    </Link>
                  </li>
                ))
              : null}
            {!seriesList ? (
              <li className="footer__link text-dim">正在同步…</li>
            ) : seriesList.length === 0 ? (
              <li className="footer__link text-dim">还没有连载</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="footer__base">
        <span>
          © 2026 {SITE.name} · 保留所有权利
        </span>
        <span>React + Vite · 纯前端博客</span>
      </div>
    </footer>
  );
}
