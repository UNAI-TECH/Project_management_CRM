import React, { useState } from 'react';

interface MonthlyData {
  month: string;
  completed: number;
  pending: number;
  overdue: number;
}

interface BarChartProps {
  data: MonthlyData[];
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ data, height = 180 }) => {
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  // Find max value for scaling
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.completed, d.pending, d.overdue, 1)),
    100
  );

  return (
    <div className="w-full flex flex-col">
      {/* Legend */}
      <div className="flex items-center justify-end gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span className="text-slate-600">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
          <span className="text-slate-600">Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
          <span className="text-slate-600">Overdue</span>
        </div>
      </div>

      {/* Chart grid */}
      <div className="relative w-full" style={{ height }}>
        {/* Horizontal grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="border-b border-slate-200 w-full" />
          <div className="border-b border-slate-200 w-full" />
          <div className="border-b border-slate-200 w-full" />
          <div className="border-b border-slate-200 w-full" />
        </div>

        {/* Bars Container */}
        <div className="absolute inset-0 flex items-end justify-between px-2 pt-4">
          {data.map((item) => {
            const completedHeight = (item.completed / maxVal) * (height - 30);
            const pendingHeight = (item.pending / maxVal) * (height - 30);
            const overdueHeight = (item.overdue / maxVal) * (height - 30);
            const isHovered = hoveredMonth === item.month;

            return (
              <div
                key={item.month}
                className="flex-1 flex flex-col items-center group cursor-pointer"
                onMouseEnter={() => setHoveredMonth(item.month)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                {/* Tooltip on hover */}
                {isHovered && (
                  <div className="absolute -top-10 bg-slate-900 text-white text-[11px] py-1 px-2.5 rounded shadow-lg z-20 whitespace-nowrap animate-fade-in">
                    <span className="font-semibold">{item.month}:</span> {item.completed} done, {item.pending} pending, {item.overdue} late
                  </div>
                )}

                {/* Grouped Bars */}
                <div className="flex items-end gap-1 px-1">
                  {/* Completed */}
                  <div
                    style={{ height: `${completedHeight}px` }}
                    className={`w-2.5 sm:w-3.5 bg-emerald-500 rounded-t-sm transition-all duration-300 ${
                      isHovered ? 'bg-emerald-400 scale-y-105' : 'opacity-90'
                    }`}
                  />
                  {/* Pending */}
                  <div
                    style={{ height: `${pendingHeight}px` }}
                    className={`w-2.5 sm:w-3.5 bg-blue-500 rounded-t-sm transition-all duration-300 ${
                      isHovered ? 'bg-blue-400 scale-y-105' : 'opacity-90'
                    }`}
                  />
                  {/* Overdue */}
                  <div
                    style={{ height: `${overdueHeight}px` }}
                    className={`w-2.5 sm:w-3.5 bg-rose-500 rounded-t-sm transition-all duration-300 ${
                      isHovered ? 'bg-rose-400 scale-y-105' : 'opacity-90'
                    }`}
                  />
                </div>

                {/* X Axis label */}
                <span
                  className={`mt-2 text-[11px] font-medium transition-colors ${
                    isHovered ? 'text-blue-600 font-bold' : 'text-slate-500'
                  }`}
                >
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
