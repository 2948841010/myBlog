import {
  Home,
  Library,
  Layers,
  User,
  Code2,
  Rss,
  Mail,
  AtSign,
} from 'lucide-react';

/**
 * 全站导航配置 —— 唯一事实来源。
 * Sidebar / MobileHeader / Footer / CommandPalette 全部从这里 map 渲染，
 * 页面组件禁止自行编写导航标记。
 */
export const NAV_ITEMS = [
  { key: 'home', label: '首页', to: '/', icon: Home, end: true },
  { key: 'posts', label: '文章', to: '/posts', icon: Library, end: false },
  { key: 'series', label: '连载', to: '/series', icon: Layers, end: false },
  { key: 'about', label: '关于', to: '/about', icon: User, end: false },
];

export const SITE = {
  name: 'zcy',
  handle: '@zcy',
  initial: 'Z',
  title: 'zcy / Agent 开发笔记',
  tagline: '一个刚开张的 Agent 开发笔记。',
  description:
    'zcy 的 Agent 开发笔记：ReAct 循环、工具设计、上下文工程、评测与上线。内容陆续更新中。',
  location: '',
  email: 'hi@zcy.dev',
  since: '',
  // 以下社交账号均为占位值，请替换成你自己的
  socials: [
    { key: 'github', label: 'GitHub', handle: 'zcy', href: 'https://github.com/zcy', icon: Code2 },
    { key: 'x', label: 'X / Twitter', handle: '@zcy', href: 'https://x.com/zcy', icon: AtSign },
    { key: 'rss', label: 'RSS', handle: '/feed.xml', href: 'https://zcy.dev/feed.xml', icon: Rss },
    { key: 'mail', label: 'Email', handle: 'hi@zcy.dev', href: 'mailto:hi@zcy.dev', icon: Mail },
  ],
};
