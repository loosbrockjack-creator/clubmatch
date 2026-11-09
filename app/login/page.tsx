import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import { CalendarDays, Heart, UserRound, Users } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to ClubMatch with your Iowa State email to keep your clubs on every device.",
};

const PERKS = [
  { icon: Heart, title: "Saves on every device", body: "Your shortlist follows you from laptop to phone." },
  { icon: Users, title: "Mark the clubs you're in", body: "Tap I'm a member and the club shows up on your profile." },
  { icon: UserRound, title: "Your own profile", body: "Photo, major, class year, and a line about you." },
  {
    icon: CalendarDays,
    title: "Club events and news",
    body: "See what's coming up, and get messages from the clubs you care about in your inbox.",
  },
];

export default function LoginPage() {
  return (
    <>
      {/* Hero: a watercolor campus scene under an angled cardinal panel. */}
      <section className="relative isolate overflow-hidden bg-cardinal-deep">
        <Image
          src="/photos/clubs/running-club.jpg"
          alt=""
          fill
          priority
          quality={90}
          sizes="100vw"
          className="-z-10 object-cover object-[50%_45%]"
        />
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 -z-10 w-full bg-cardinal/90 [clip-path:polygon(0_0,100%_0,100%_100%,0_100%)] sm:w-[64%] sm:[clip-path:polygon(0_0,86%_0,100%_42%,78%_100%,0_100%)] lg:w-[56%]"
        />
        <div className="shell flex min-h-[300px] items-center py-14 sm:min-h-[420px]">
          <h1 className="display max-w-[11ch] text-[44px] leading-[1.02] text-white sm:max-w-[12ch] sm:text-[64px] lg:text-[76px]">
            Your <span className="text-gold">clubs</span>, all in one place.
          </h1>
        </div>
      </section>

      <section className="shell pb-20 pt-14 sm:pt-20">
        <h2 className="display text-[38px] leading-tight text-cardinal sm:text-[56px]">
          Your ClubMatch account
        </h2>
        <p className="mt-5 max-w-3xl text-[16px] leading-relaxed text-ink-soft sm:text-[17px]">
          One account for everything you do on ClubMatch: the clubs you&apos;re eyeing, the
          ones you&apos;re in, and your profile. Free for Iowa State students.
        </p>

        <div className="mt-12 grid gap-14 md:grid-cols-2 md:gap-16">
          <div>
            <h3 className="display text-[28px] text-cardinal sm:text-[32px]">
              Sign in or create an account
            </h3>
            <div className="mt-5 h-[3px] w-12 bg-gold" />
            <Suspense fallback={<div className="skeleton mt-7 h-[150px] rounded-[4px]" />}>
              <LoginForm />
            </Suspense>
          </div>

          <div>
            <h3 className="display text-[28px] text-cardinal sm:text-[32px]">What you get</h3>
            <div className="mt-5 h-[3px] w-12 bg-gold" />
            <ul className="mt-7 space-y-6">
              {PERKS.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-4">
                  <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cardinal-tint text-cardinal">
                    <Icon size={18} strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <p className="text-[15.5px] font-semibold text-ink">{title}</p>
                    <p className="mt-1 text-[14.5px] leading-relaxed text-ink-soft">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
