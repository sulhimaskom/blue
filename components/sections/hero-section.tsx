import { Button } from "@/components/ui/button";

import { HOMEPAGE } from "@/lib/constants";
import { Gradients } from "@/lib/constants/gradients";
import { getTextColor, cn, getButtonTheme } from "@/lib/constants/ui-themes";

interface HeroSectionProps {
  title?: string;
  description?: string;
  subtitle?: string;
}

export function HeroSection({
  title,
  subtitle = HOMEPAGE.HERO.SUBTITLE,
  description,
}: HeroSectionProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <div className="text-center lg:text-left">
          <h1 className={`text-4xl font-bold ${Gradients.HERO_TEXT}`}>
            {title || HOMEPAGE.HERO.TITLE}
          </h1>
          {description ? (
            <p className={cn("mt-4 text-lg", getTextColor("body"))}>
              {description}
            </p>
          ) : (
            <p className={cn("mt-4 text-lg", getTextColor("body"))}>
              {subtitle}
            </p>
          )}
          <div className="mt-8 flex gap-4 justify-center lg:justify-start">
            <Button size="lg" className={getButtonTheme("primary")}>
              {HOMEPAGE.HERO.ACTIONS.GET_STARTED}
            </Button>
            <Button variant="outline" size="lg">
              {HOMEPAGE.HERO.ACTIONS.VIEW_DEMO}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
