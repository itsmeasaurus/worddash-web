"use client";

import {
  CREDIT_PRICE_USD,
  PLAYS_PER_CREDIT,
  CENTS_PER_GAME,
} from "@/lib/credits";

const getPerks = () => [
  { label: "1 credit", value: `$${CREDIT_PRICE_USD} USD`, note: "flat" },
  { label: "1 credit", value: `${PLAYS_PER_CREDIT} plays`, note: `that's ${CENTS_PER_GAME}¢ per game` },
  { label: "No subscriptions", value: "Ever", note: "pay only when you need more" },
];

export function PricingSection() {
  const perks = getPerks();

  return (
    <section id="pricing" className="bg-[#F5E642] border-b-4 border-[#0D0D0D]">
      <div className="max-w-6xl mx-auto px-6 py-20">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-12">
          <div className="h-1 w-10 bg-[#0D0D0D] rounded-full" />
          <h2 className="font-mono font-bold text-3xl md:text-4xl uppercase tracking-tight text-[#0D0D0D]">
            Pricing
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Main pricing card */}
          <div
            className="bg-[#0D0D0D] rounded-xl p-8 md:p-10"
            style={{ border: "3px solid #0D0D0D", boxShadow: "8px 8px 0px #FF5C3A" }}
          >
            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 bg-[#FF5C3A] border-2 border-[#FAFAF5] rounded-full">
              <span className="font-mono font-bold text-xs uppercase tracking-widest text-[#FAFAF5]">
                Simple pricing
              </span>
            </div>

            <div className="mb-6">
              <span className="font-mono font-bold text-6xl md:text-7xl text-[#F5E642] leading-none">${CREDIT_PRICE_USD}</span>
              <span className="font-mono font-bold text-xl text-[#FAFAF5] ml-3 opacity-70">/ credit</span>
            </div>

            <p className="font-sans text-[#FAFAF5] text-lg font-medium leading-relaxed mb-8 opacity-80">
              Buy credits to play. No subscription — you only pay when you need more games.
            </p>

            <button className="w-full font-mono font-bold text-base uppercase tracking-widest px-8 py-4 bg-[#3DFFC0] text-[#0D0D0D] border-2 border-[#FAFAF5] rounded-lg shadow-[4px_4px_0px_#FAFAF5] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all duration-100 cursor-pointer">
              Buy Credits →
            </button>
          </div>

          {/* Breakdown cards */}
          <div className="flex flex-col gap-4">
            {perks.map((perk) => (
              <div
                key={perk.value}
                className="bg-[#FAFAF5] rounded-xl p-5 flex items-center justify-between"
                style={{ border: "3px solid #0D0D0D", boxShadow: "5px 5px 0px #0D0D0D" }}
              >
                <div>
                  <p className="font-mono font-bold text-sm uppercase tracking-widest text-[#0D0D0D] opacity-60">
                    {perk.label}
                  </p>
                  <p className="font-sans font-extrabold text-2xl text-[#0D0D0D] leading-tight">
                    {perk.value}
                  </p>
                </div>
                <span className="font-mono text-xs text-[#0D0D0D] opacity-50 text-right max-w-[120px] leading-snug">
                  {perk.note}
                </span>
              </div>
            ))}

            {/* Highlight note */}
            <div
              className="bg-[#3DFFC0] rounded-xl p-5 flex items-center gap-4"
              style={{ border: "3px solid #0D0D0D", boxShadow: "5px 5px 0px #0D0D0D" }}
            >
              <span className="text-3xl select-none" aria-hidden="true">💡</span>
              <p className="font-sans font-bold text-sm text-[#0D0D0D] leading-relaxed">
                Credits never expire. Stock up and play whenever you want.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
