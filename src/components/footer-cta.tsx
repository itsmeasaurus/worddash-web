"use client";

import Link from "next/link";

export function FooterCta() {
  return (
    <footer className="bg-[#0D0D0D]">
      {/* Big CTA strip */}
      <div className="max-w-6xl mx-auto px-6 py-20 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <span className="font-mono font-bold text-xs uppercase tracking-widest text-[#FF5C3A] block mb-3">
            Ready to play?
          </span>
          <h2 className="font-sans font-extrabold text-4xl md:text-5xl uppercase text-[#F5E642] leading-tight text-balance">
            Start a room.<br />Beat your friends.
          </h2>
        </div>

        <Link
          href="/play"
          className="shrink-0 font-mono font-bold text-base uppercase tracking-widest px-10 py-5 bg-[#F5E642] text-[#0D0D0D] border-2 border-[#F5E642] rounded-xl shadow-[6px_6px_0px_#FF5C3A] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all duration-100 cursor-pointer inline-block"
        >
          Play WordDash →
        </Link>
      </div>

      {/* Footer bottom bar */}
      <div className="border-t-2 border-[#222222]">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-mono font-bold text-sm tracking-widest text-[#FAFAF5] uppercase">
            Word<span className="text-[#FF5C3A]">Dash</span>
          </span>
          <span className="font-mono text-xs text-[#555555] uppercase tracking-widest">
            &copy; {new Date().getFullYear()} WordDash. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
