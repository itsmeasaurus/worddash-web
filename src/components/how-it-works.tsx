"use client";

const steps = [
  {
    number: "01",
    title: "Create",
    description:
      "Spin up a room in one click and get a shareable link instantly. Up to 4 players per game — no accounts needed.",
    bg: "#FAFAF5",
    accent: "#4DAAFF",
    shadow: "#4DAAFF",
  },
  {
    number: "02",
    title: "Invite",
    description:
      "Share the link with friends. Everyone joins with a nickname. No sign-up, no friction — just paste and play.",
    bg: "#F5E642",
    accent: "#FF5C3A",
    shadow: "#FF5C3A",
  },
  {
    number: "03",
    title: "Guess",
    description:
      "Each round reveals a masked word and a hint. Type fast — the first correct guess wins the points.",
    bg: "#3DFFC0",
    accent: "#0D0D0D",
    shadow: "#0D0D0D",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#FAFAF5] border-b-4 border-[#0D0D0D]">
      <div className="max-w-6xl mx-auto px-6 py-20">
        {/* Section header */}
        <div className="flex items-center gap-4 mb-12">
          <div className="h-1 w-10 bg-[#FF5C3A] rounded-full" />
          <h2 className="font-mono font-bold text-3xl md:text-4xl uppercase tracking-tight text-[#0D0D0D]">
            How It Works
          </h2>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-xl border-3 border-[#0D0D0D] p-7 flex flex-col gap-4"
              style={{
                backgroundColor: step.bg,
                borderWidth: "3px",
                borderColor: "#0D0D0D",
                boxShadow: `6px 6px 0px ${step.shadow}`,
              }}
            >
              {/* Step number badge */}
              <span
                className="font-mono font-bold text-xs uppercase tracking-widest px-3 py-1 rounded-full border-2 border-[#0D0D0D] w-fit"
                style={{ backgroundColor: step.accent, color: step.accent === "#0D0D0D" ? "#FAFAF5" : "#0D0D0D" }}
              >
                Step {step.number}
              </span>

              {/* Big step number */}
              <span className="font-mono font-bold text-7xl leading-none text-[#0D0D0D] opacity-10 select-none">
                {step.number}
              </span>

              <div className="-mt-10">
                <h3 className="font-sans font-extrabold text-2xl uppercase tracking-tight text-[#0D0D0D] mb-2">
                  {step.title}
                </h3>
                <p className="font-sans text-[#0D0D0D] leading-relaxed font-medium text-sm">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
