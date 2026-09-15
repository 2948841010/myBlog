import { useLocation } from 'react-router-dom';
import { ArrowRight, Home, Layers, Library, User } from 'lucide-react';

import { Button } from '../components/ui/Button.jsx';
import { Tag } from '../components/ui/Tag.jsx';
import { Terminal } from '../components/ui/Terminal.jsx';
import { ContainerScroll } from '../components/fx/ScrollFx.jsx';
import { MagneticWrap } from '../components/fx/PointerFx.jsx';
import { TextReveal } from '../components/fx/TextFx.jsx';

/**
 * 404：把「找不到页面」当成一次失败的 Agent 步骤来呈现。
 * 无数据依赖，三行静态终端输出 + 页内快捷入口（全部走 Link，不使用页内锚点）。
 * 动效：404 大字故障层（纯 CSS 关键帧）、说明文字 TextReveal、
 *      终端 ContainerScroll 滚动翻平、按钮 MagneticWrap 磁吸。
 */
export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <div
      className="page page--narrow"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <div className="eyebrow eyebrow--accent">ERROR 404</div>

      <h1 className="display-hero" style={{ marginTop: 'var(--sp-3)' }}>
        <span className="glitch">
          <span className="glitch__layer glitch__layer--a" aria-hidden="true">
            404
          </span>
          <span className="glitch__layer glitch__layer--b" aria-hidden="true">
            404
          </span>
          <span className="glitch__core">404</span>
        </span>
      </h1>

      <p className="lede" style={{ marginTop: 'var(--sp-4)' }}>
        <TextReveal
          as="span"
          variant="generate"
          step={0.014}
          text="这条路径没有对应的 Agent 步骤。可能是链接抄漏了一段，也可能是文章改过标题却忘了留下跳转。"
        />
      </p>

      <p className="mono text-dim" style={{ fontSize: 'var(--fs-12)', marginTop: 'var(--sp-3)' }}>
        当前路径 {pathname}
      </p>

      <ContainerScroll style={{ marginTop: 'var(--sp-10)' }}>
        <Terminal title="agent resolve --path">
          <div className="terminal__line">
            <span className="terminal__prompt">$</span>
            <span>agent resolve --path</span>
          </div>
          <div className="terminal__line">
            <span className="terminal__prompt" style={{ opacity: 0.35 }}>
              ›
            </span>
            <span className="terminal__out">
              查找失败：路由表里没有能处理 {pathname} 的动作
            </span>
          </div>
          <div className="terminal__line">
            <span className="terminal__prompt" style={{ opacity: 0.35 }}>
              ›
            </span>
            <span className="terminal__out">fallback → 404 · 已回退到兜底处理器</span>
            <span className="caret" aria-hidden="true" />
          </div>
        </Terminal>
      </ContainerScroll>

      <div className="btn-row" style={{ marginTop: 'var(--sp-8)' }}>
        <MagneticWrap>
          <Button island to="/" icon={Home} iconRight={ArrowRight}>
            回到首页
          </Button>
        </MagneticWrap>
        <MagneticWrap>
          <Button island variant="ghost" to="/posts" icon={Library} iconRight={ArrowRight}>
            浏览全部文章
          </Button>
        </MagneticWrap>
      </div>

      <div className="tag-row" style={{ marginTop: 'var(--sp-6)' }}>
        <Tag to="/" size="sm" icon={Home}>
          首页
        </Tag>
        <Tag to="/posts" size="sm" icon={Library}>
          文章
        </Tag>
        <Tag to="/series" size="sm" icon={Layers}>
          连载
        </Tag>
        <Tag to="/about" size="sm" icon={User}>
          关于
        </Tag>
      </div>
    </div>
  );
}
