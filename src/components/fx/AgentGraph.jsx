import { NumberTicker } from './TextFx.jsx';
import { useMediaQuery } from '../../lib/hooks.js';

/* ============================================================================
   Agent 执行链路图（hero 右列的第二张卡）
   表现：节点 + 连线 + 沿连线流动的数据包 + 依次亮起的节点脉冲 + 底部指标
   成本：纯 SVG + CSS 关键帧，无 canvas、无 rAF、无第三方依赖；
        reduced-motion 下所有关键帧停止（见 fx.css 的降级块）。
   viewBox 取宽扁比例（420×122），保证卡片高度克制、不把 hero 顶高。
   ============================================================================ */

const NODES = [
  { id: 'task', cx: 16, cy: 26, label: 'task', labelX: 28, tone: 'base' },
  { id: 'plan', cx: 16, cy: 78, label: 'plan / decide', labelX: 28, tone: 'accent' },
  { id: 't1', cx: 146, cy: 20, label: 'query_orders', labelX: 158, tone: 'base' },
  { id: 't2', cx: 146, cy: 58, label: 'issue_refund', labelX: 158, tone: 'base' },
  { id: 't3', cx: 146, cy: 96, label: 'eval_replay', labelX: 158, tone: 'base' },
  {
    id: 'answer',
    cx: 330,
    cy: 58,
    label: 'answer',
    labelX: 330,
    labelY: 32,
    anchor: 'middle',
    tone: 'teal',
  },
];

const EDGES = [
  { d: 'M24,26 C20,26 16,30 16,36 L16,72', tone: 'accent' },
  { d: 'M24,78 C74,78 94,20 138,20', tone: 'base' },
  { d: 'M24,78 C74,78 94,58 138,58', tone: 'base' },
  { d: 'M24,78 C74,78 94,96 138,96', tone: 'base' },
  { d: 'M154,20 C240,20 258,58 322,58', tone: 'teal' },
  { d: 'M154,58 C240,58 258,58 322,58', tone: 'teal' },
  { d: 'M154,96 C240,96 258,58 322,58', tone: 'teal' },
  { d: 'M338,64 C352,122 46,124 16,86', tone: 'accent', loop: true },
];

/* 底部不是「成绩」，而是这张示意图自己的结构信息 —— 博客还没有数据时也不会有虚假指标 */
const STATS = [
  { label: '节点', value: 6, decimals: 0, suffix: '' },
  { label: '连线', value: 8, decimals: 0, suffix: '' },
  { label: '最大步数', value: 8, decimals: 0, suffix: '' },
];

export function AgentGraph({ className = '' }) {
  // SVG 文本会随 viewBox 一起缩放，窄屏下标签会小到不可读；
  // 移动端直接不渲染标签，只保留节点与流动连线作为氛围层，信息由下方指标承担。
  const compact = useMediaQuery('(max-width: 900px)');

  return (
    <div className={`agx panel ${className}`.trim()}>
      <div className="agx__head">
        <span className="agx__dot" aria-hidden="true" />
        agent loop
        <span className="grow" />
        <span>max 8 steps</span>
      </div>

      <svg className="agx__svg" viewBox="0 0 420 122" aria-hidden="true" focusable="false">
        {/* 连线底座 */}
        {EDGES.map((e, i) => (
          <path key={`base-${i}`} className="agx__edge" d={e.d} />
        ))}

        {/* 沿连线流动的数据包：dasharray 4+16 = 20，dashoffset 走满 20 即无缝循环 */}
        {EDGES.map((e, i) => (
          <path
            key={`flow-${i}`}
            className={`agx__flow agx__flow--${e.tone}`}
            d={e.d}
            style={{ animationDelay: `${(i % 4) * 0.2}s` }}
          />
        ))}

        {/* 节点 */}
        {NODES.map((n, i) => (
          <g key={n.id}>
            <circle
              className="agx__pulse"
              cx={n.cx}
              cy={n.cy}
              r="7"
              style={{ animationDelay: `${i * 0.42}s` }}
            />
            <circle className={`agx__node agx__node--${n.tone}`} cx={n.cx} cy={n.cy} r="5" />
            {compact ? null : (
              <text
                className={`agx__label agx__label--${n.tone}`}
                x={n.labelX}
                y={n.labelY ?? n.cy}
                textAnchor={n.anchor ?? 'start'}
              >
                {n.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      <div className="agx__stats">
        {STATS.map((s) => (
          <span className="agx__stat" key={s.label}>
            {s.label}
            <b>
              <NumberTicker value={s.value} decimals={s.decimals} suffix={s.suffix} />
            </b>
          </span>
        ))}
      </div>
    </div>
  );
}

export default AgentGraph;
