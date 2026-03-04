import { Navbar } from "@/components/navbar";
import { HeroSection } from "@/components/hero-section";
import { HowItWorks } from "@/components/how-it-works";
import { PricingSection } from "@/components/pricing-section";
import { FooterCta } from "@/components/footer-cta";
import { Analytics } from "@vercel/analytics/next"

export default function HomePage() {
  return (
    <>
    <Analytics />
    <main className="min-h-screen bg-[#F5E642]">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <PricingSection />
      <FooterCta />
    </main>
    </>
  );
}
