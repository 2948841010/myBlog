import { Cpu, Network, Gauge, Rocket } from 'lucide-react';

/** 系列图标映射：mock 里只存字符串 key，UI 层统一映射（模板仅展示常用系列图标） */
const SERIES_ICONS = {
  cpu: Cpu,
  network: Network,
  gauge: Gauge,
  rocket: Rocket,
};

export function seriesIcon(key) {
  return SERIES_ICONS[key] || Cpu;
}
