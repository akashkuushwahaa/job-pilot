import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { CallToAction } from "@/components/homepage/CallToAction";
import { Features } from "@/components/homepage/Features";
import { Hero } from "@/components/homepage/Hero";
import { HowItWorks } from "@/components/homepage/HowItWorks";
import { ProductPreview } from "@/components/homepage/ProductPreview";
import { Testimonial } from "@/components/homepage/Testimonial";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ProductPreview />
        <HowItWorks />
        <Features />
        <Testimonial />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
