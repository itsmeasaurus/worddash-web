"use client";

import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-[#FAFAF5] border-b-4 border-[#0D0D0D]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="font-mono font-bold text-xl tracking-widest text-[#0D0D0D] uppercase hover:opacity-80 transition-opacity"
        >
          Word<span className="text-[#FF5C3A]">Dash</span>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#how-it-works"
            className="font-mono font-bold text-sm uppercase tracking-widest text-[#0D0D0D] hover:text-[#FF5C3A] transition-colors"
          >
            How It Works
          </a>
          <a
            href="#pricing"
            className="font-mono font-bold text-sm uppercase tracking-widest text-[#0D0D0D] hover:text-[#FF5C3A] transition-colors"
          >
            Pricing
          </a>
        </nav>

        {/* CTA */}
        <Link
          href="/play"
          className="font-mono font-bold text-sm uppercase tracking-widest px-5 py-2.5 bg-[#3DFFC0] text-[#0D0D0D] border-2 border-[#0D0D0D] rounded-md shadow-[3px_3px_0px_#0D0D0D] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all duration-100 cursor-pointer inline-block"
        >
          Play Now
        </Link>
      </div>
    </header>
  );
}
