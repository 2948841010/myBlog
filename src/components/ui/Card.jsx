import { Link } from 'react-router-dom';
import { useSpotlight } from '../../lib/hooks.js';

/** 基础卡片容器 */
export function Card({ as = 'div', to, className = '', children, hover = false, ...rest }) {
  const cls = ['card', hover ? 'card--hover' : '', className].filter(Boolean).join(' ');
  if (to) {
    return (
      <Link to={to} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  const Comp = as;
  return (
    <Comp className={cls} {...rest}>
      {children}
    </Comp>
  );
}

/** 聚光卡片：鼠标位置决定描边高光（配合 .spotlight 样式） */
export function SpotlightCard({ to, className = '', children, as = 'div', ...rest }) {
  const { ref, onMouseMove } = useSpotlight();
  const cls = ['card', 'card--hover', 'spotlight', className].filter(Boolean).join(' ');

  if (to) {
    return (
      <Link to={to} className={cls} ref={ref} onMouseMove={onMouseMove} {...rest}>
        {children}
      </Link>
    );
  }
  const Comp = as;
  return (
    <Comp className={cls} ref={ref} onMouseMove={onMouseMove} {...rest}>
      {children}
    </Comp>
  );
}
