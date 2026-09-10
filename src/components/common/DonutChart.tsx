import React, { useState } from 'react';

interface DonutSegment {
  label: string;
  value: number;
  color: string;
  hoverColor: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  totalLabel?: string;
  size?: number;
  thickness?: number;
  showLegend?: boolean;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  totalLabel = 'Total',
  size = 180,
  thickness = 26,
  showLegend = true,
}) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const radius = size / 2;
  const innerRadius = radius - thickness;
  const center = size / 2;

  // Calculate SVG arc paths
  let cumulativeAngle = 0;
  const segments = data.map((item, idx) => {
    const angle = total > 0 ? (item.value / total) * 360 : 0;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle += angle;

    const isLargeArc = angle > 180 ? 1 : 0;

    // Convert degrees to radians
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const x3 = center + innerRadius * Math.cos(endRad);
    const y3 = center + innerRadius * Math.sin(endRad);
    const x4 = center + innerRadius * Math.cos(startRad);
    const y4 = center + innerRadius * Math.sin(startRad);

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${isLargeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${isLargeArc} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');

    return {
      ...item,
      pathData,
      idx,
      angle,
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 justify-between">
      {/* Chart Canvas */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg width={size} height={size} className="overflow-visible drop-shadow-sm">
          {segments.map((seg) => (
            <path
              key={seg.idx}
              d={seg.pathData}
              fill={activeIdx === seg.idx ? seg.hoverColor : seg.color}
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setActiveIdx(seg.idx)}
              onMouseLeave={() => setActiveIdx(null)}
            />
          ))}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-extrabold text-slate-800 tracking-tight">
            {activeIdx !== null ? data[activeIdx].value : total}
          </span>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {activeIdx !== null ? data[activeIdx].label : totalLabel}
          </span>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-col gap-2.5 w-full max-w-[200px]">
          {data.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer text-xs ${
                activeIdx === idx ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
              }`}
              onMouseEnter={() => setActiveIdx(idx)}
              onMouseLeave={() => setActiveIdx(null)}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-600 truncate">{item.label}</span>
              </div>
              <span className="font-bold text-slate-800">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
