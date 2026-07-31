import Image from "next/image";
import { Quote } from "lucide-react";

export function Testimonial() {
  return (
    <section className="bg-background py-20">
      <div className="mx-auto w-full max-w-[1440px] px-6">
        <figure className="mx-auto max-w-4xl rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-10">
          <Quote className="size-6 text-accent-light" />

          <blockquote className="mt-5 text-xl leading-9 font-medium text-text-primary sm:text-2xl sm:leading-10">
            I used to spend every evening reading job descriptions and guessing
            which ones were worth it. Now I open the dashboard, see what actually
            fits, and walk into the call knowing enough to have a real
            conversation.
          </blockquote>

          <figcaption className="mt-8 flex items-center gap-3 border-t border-border pt-6">
            <Image
              src="/images/user-icon.png"
              alt=""
              width={192}
              height={192}
              className="size-10 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-medium text-text-primary">
                Tom Wilson
              </p>
              <p className="text-xs text-text-muted">Junior Developer</p>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
