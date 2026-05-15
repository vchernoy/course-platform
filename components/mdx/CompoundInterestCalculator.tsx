"use client";

import { useMemo, useState } from "react";

/** Future value with annual compounding and contributions at year-end: FV = P(1+r)^n + C(((1+r)^n - 1) / r). */
function futureValue(
  principal: number,
  annualContribution: number,
  annualRateFraction: number,
  years: number
): number {
  if (years <= 0) return principal;
  if (annualRateFraction === 0) return principal + annualContribution * years;
  const factor = (1 + annualRateFraction) ** years;
  return principal * factor + annualContribution * ((factor - 1) / annualRateFraction);
}

export function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState(10000);
  const [annualContribution, setAnnualContribution] = useState(6000);
  const [annualReturnPct, setAnnualReturnPct] = useState(7);
  const [years, setYears] = useState(20);

  const fv = useMemo(
    () =>
      futureValue(
        principal,
        annualContribution,
        annualReturnPct / 100,
        Math.floor(years)
      ),
    [principal, annualContribution, annualReturnPct, years]
  );

  const formatted = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(fv),
    [fv]
  );

  return (
    <div className="my-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900">
        Compound growth calculator
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Initial amount ($)</span>
          <input
            type="number"
            min={0}
            value={principal}
            onChange={(e) => setPrincipal(Number(e.target.value))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Annual contribution ($)</span>
          <input
            type="number"
            min={0}
            value={annualContribution}
            onChange={(e) => setAnnualContribution(Number(e.target.value))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Annual return (%)</span>
          <input
            type="number"
            step={0.1}
            value={annualReturnPct}
            onChange={(e) => setAnnualReturnPct(Number(e.target.value))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Years</span>
          <input
            type="number"
            min={0}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
          />
        </label>
      </div>
      <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-base font-medium text-emerald-900">
        Future value: <span className="tabular-nums">{formatted}</span>
      </p>
    </div>
  );
}
