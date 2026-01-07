import { Button } from "@/components/ui/button";
import Link from "next/link";

import { getUIText } from "@/lib/constants/ui-text";
import { Gradients } from "@/lib/constants/gradients";
import { getTextColor, cn, getButtonTheme } from "@/lib/constants/ui-themes";

interface HeroSectionProps {
  title?: string;
  description?: string;
  subtitle?: string;
}

export function HeroSection({
  title,
  subtitle,
  description,
}: HeroSectionProps) {
  // Use centralized UI text with fallback props
  const heroTitle = title || getUIText("homepage", "hero.title");
  const heroSubtitle = subtitle || getUIText("homepage", "hero.subtitle");
  const getStartedText = getUIText("homepage", "hero.actions.getStarted");
  const viewDemoText = getUIText("homepage", "hero.actions.viewDemo");

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <div className="text-center lg:text-left">
          <h1 className={`text-4xl font-bold ${Gradients.HERO_TEXT}`}>
            {heroTitle}
          </h1>
          {description ? (
            <p className={cn("mt-4 text-lg", getTextColor("body"))}>
              {description}
            </p>
          ) : (
            <p className={cn("mt-4 text-lg", getTextColor("body"))}>
              {heroSubtitle}
            </p>
          )}
          <div className="mt-8 flex gap-4 justify-center lg:justify-start">
            <Button size="lg" className={getButtonTheme("primary")} asChild>
              <Link href="/sign-up">{getStartedText}</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/dashboard/monitoring">{viewDemoText}</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
