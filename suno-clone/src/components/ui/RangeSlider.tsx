import React from 'react';
import { RotateCcw } from 'lucide-react';

interface RangeSliderProps {
  label: string;
  value: number; // 0–100
  onChange: (value: number) => void;
  defaultValue?: number;
  /** Formats the right-hand readout; default is `${value}%`. */
  format?: (value: number) => string;
}

export function RangeSlider({
  label,
  value,
  onChange,
  defaultValue = 0,
  format = (v) => `${v}%`,
}: RangeSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-100">{label}</span>
          {value !== defaultValue && (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              title="Скинути"
              className="p-1 text-neutral-300 hover:text-neutral-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-sm font-medium text-neutral-50 tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full h-1 bg-neutral-500 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:shadow-glow-orange [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary-500 [&::-moz-range-thumb]:border-0"
      />
    </div>
  );
}
