import { NumberTicker } from '../fx/TextFx.jsx';

/** 数字滚动统计卡：进入视口后从 0 递增到目标值（跑完即停，不再占用 rAF） */
export function StatCounter({
  value = 0,
  suffix = '',
  label = '',
  className = '',
  decimals = 0,
}) {
  return (
    <div className={`stat ${className}`.trim()}>
      <span className="stat__value">
        <NumberTicker value={value} decimals={decimals} />
        {suffix ? <small>{suffix}</small> : null}
      </span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
