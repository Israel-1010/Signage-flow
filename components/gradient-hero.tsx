import React from "react";

interface GradientHeroProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function GradientHero({ title, subtitle, actions }: GradientHeroProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-rose-500 to-orange-400 px-6 py-4 text-white shadow">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          {subtitle && <p className="text-sm opacity-80">{subtitle}</p>}
          <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
