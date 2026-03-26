"use client";

import Link from "next/link";
import { Users, FlaskConical, Settings, Sparkles } from "lucide-react";
import { useAssistant } from "@/components/assistant/assistant-provider";

type BaseCard = {
  title: string;
  description: string;
  icon: typeof Users;
  color: string;
};

type RouteCard = BaseCard & {
  href: string;
  isChat?: false;
};

type ChatCard = BaseCard & {
  isChat: true;
};

type FeatureCard = RouteCard | ChatCard;

const featureCards: FeatureCard[] = [
  {
    title: "Create Personas",
    description: "Generate realistic user profiles",
    icon: Users,
    href: "/personas/new",
    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  },
  {
    title: "New Study",
    description: "Set up interviews with AI",
    icon: FlaskConical,
    href: "/studies/new",
    color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  },
  {
    title: "Product Context",
    description: "Describe your product for better results",
    icon: Settings,
    href: "/settings",
    color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  },
  {
    title: "Ask AI",
    description: "Get help from the assistant",
    icon: Sparkles,
    color: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    isChat: true,
  },
];

export function FeatureCards() {
  const { open, setChatView } = useAssistant();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {featureCards.map((card) => {
        const Icon = card.icon;

        if (card.isChat) {
          return (
            <button
              key={card.title}
              type="button"
              onClick={() => {
                setChatView("chat");
                open();
              }}
              className="group rounded-2xl bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`inline-flex rounded-xl p-2.5 ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold">{card.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{card.description}</p>
            </button>
          );
        }

        return (
          <Link
            key={card.title}
            href={card.href}
            className="group rounded-2xl bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className={`inline-flex rounded-xl p-2.5 ${card.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold">{card.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{card.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
