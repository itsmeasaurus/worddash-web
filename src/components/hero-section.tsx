"use client";

import Link from "next/link";

export function HeroSection() {
  return (
    <section className="bg-[#F5E642] border-b-4 border-[#0D0D0D]">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        {/* Marquee tag line */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 bg-[#FF5C3A] border-2 border-[#0D0D0D] rounded-full shadow-[3px_3px_0px_#0D0D0D]">
          <span className="w-2 h-2 rounded-full bg-[#FAFAF5] animate-pulse" />
          <span className="font-mono font-bold text-xs uppercase tracking-widest text-[#FAFAF5]">
            Live Multiplayer
          </span>
        </div>

        {/* Big headline */}
        <h1 className="font-sans font-extrabold text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight text-[#0D0D0D] uppercase text-balance mb-6">
          Guess the<br />
          <span className="relative inline-block">
            <span className="relative z-10">Word.</span>
            <span className="absolute inset-x-0 bottom-1 h-4 bg-[#3DFFC0] -z-0 border-b-2 border-[#0D0D0D]" />
          </span>{" "}
          <span className="text-[#FF5C3A]">Win</span>{" "}
          the<br className="hidden md:block" /> Round.
        </h1>

        <p className="font-sans text-lg md:text-xl text-[#0D0D0D] max-w-xl leading-relaxed mb-10 font-medium">
          Create a room, invite friends, and race to guess the masked word.
          Fast 3-minute matches with hints and bragging rights on the line.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/play"
            className="font-mono font-bold text-base uppercase tracking-widest px-8 py-4 bg-[#0D0D0D] text-[#F5E642] border-2 border-[#0D0D0D] rounded-lg shadow-[5px_5px_0px_#FF5C3A] hover:shadow-none hover:translate-x-[5px] hover:translate-y-[5px] transition-all duration-100 cursor-pointer inline-block"
          >
            Start Playing →
          </Link>
          <a
            href="#how-it-works"
            className="font-mono font-bold text-base uppercase tracking-widest px-8 py-4 bg-transparent text-[#0D0D0D] border-2 border-[#0D0D0D] rounded-lg hover:bg-[#0D0D0D] hover:text-[#F5E642] transition-all duration-100 cursor-pointer inline-block"
          >
            See How It Works
          </a>
        </div>

        {/* Stats strip */}
        <div className="mt-16 flex flex-wrap gap-6">
          {[
            { value: "4", label: "Players per room" },
            { value: "3 min", label: "Match length" },
            { value: "No signup", label: "Join instantly" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 bg-[#FAFAF5] border-2 border-[#0D0D0D] rounded-lg px-5 py-3 shadow-[3px_3px_0px_#0D0D0D]"
            >
              <span className="font-mono font-bold text-2xl text-[#0D0D0D]">{stat.value}</span>
              <span className="font-sans text-sm text-[#0D0D0D] font-medium leading-tight">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
