import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { CallToAction } from "@/components/homepage/CallToAction";
import { Features } from "@/components/homepage/Features";
import { Hero } from "@/components/homepage/Hero";
import { HowItWorks } from "@/components/homepage/HowItWorks";
import { ProductPreview } from "@/components/homepage/ProductPreview";
import { Testimonial } from "@/components/homepage/Testimonial";
import { getSessionUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSessionUser();

  const ctaHref = user ? "/dashboard" : "/login";
  const navCtaLabel = user ? "Go to dashboard" : "Start for free";
  const heroCtaLabel = user ? "Go to dashboard" : "Get started free";

  return (
    <>
      <Navbar ctaHref={ctaHref} ctaLabel={navCtaLabel} />
      <main className="flex-1">
        <Hero ctaHref={ctaHref} ctaLabel={heroCtaLabel} />
        <ProductPreview />
        <HowItWorks />
        <Features />
        <Testimonial />
        <CallToAction ctaHref={ctaHref} ctaLabel={heroCtaLabel} />
      </main>
      <Footer />
    </>
  );
}
