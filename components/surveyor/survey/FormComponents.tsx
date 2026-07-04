"use client";

import React from "react";

export function FormCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-blue-200 text-sm mt-1">{subtitle}</p>}
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`}
    />
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function OptionGrid<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: string; description?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`p-4 rounded-xl border-2 text-left transition-all ${
            value === o.value
              ? "border-blue-500 bg-blue-50 shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {o.icon && <span className="text-2xl block mb-1">{o.icon}</span>}
          <span className={`text-sm font-medium block ${value === o.value ? "text-blue-700" : "text-slate-700"}`}>
            {o.label}
          </span>
          {o.description && (
            <span className="text-xs text-slate-500 mt-0.5 block">{o.description}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left ${
        checked ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div>
        <span className={`text-sm font-medium ${checked ? "text-blue-700" : "text-slate-700"}`}>
          {label}
        </span>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div
        className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-3 ${
          checked ? "bg-blue-500" : "bg-slate-300"
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow-sm mt-0.5 transition-transform ${
            checked ? "translate-x-5.5" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 30,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-10 h-10 rounded-full border-2 border-slate-300 flex items-center justify-center text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all font-bold text-lg"
      >
        −
      </button>
      <div className="text-center min-w-[3rem]">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {label && <span className="text-xs text-slate-500 block">{label}</span>}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-10 h-10 rounded-full border-2 border-slate-300 flex items-center justify-center text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-all font-bold text-lg"
      >
        +
      </button>
    </div>
  );
}

export function NavButtons({
  onNext,
  onBack,
  nextLabel = "Next step →",
  nextDisabled = false,
}: {
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-all"
        >
          ← Back
        </button>
      ) : (
        <div />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        {nextLabel}
      </button>
    </div>
  );
}
