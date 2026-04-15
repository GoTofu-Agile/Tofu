"use client";

import { useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, FlaskConical, Settings, Sparkles } from "lucide-react";
import { useAssistant } from "@/components/assistant/assistant-provider";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

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
    description: "Run interviews and get insights",
    icon: FlaskConical,
    href: "/studies/new",
    color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  },
  {
    title: "Product Context",
    description: "Improve persona and study quality",
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
  const reduced = useReducedMotion();

  const handleOpenChat = useCallback(() => {
    setChatView("chat");
    open();
  }, [setChatView, open]);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {featureCards.map((card, i) => {
        const Icon = card.icon;

        if (card.isChat) {
          return (
            <motion.div
              key={card.title}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { delay: i * 0.06, type: "spring", stiffness: 300, damping: 25 }
              }
              whileHover={
                reduced
                  ? undefined
                  : { y: -4, transition: { type: "spring", stiffness: 400, damping: 25 } }
              }
            >
              <button
                type="button"
                onClick={handleOpenChat}
                className="group h-full w-full rounded-2xl bg-card p-5 text-left shadow-sm transition-all hover:shadow-md"
              >
                <div className={`inline-flex rounded-xl p-2.5 ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold">{card.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{card.description}</p>
              </button>
            </motion.div>
          );
        }

        return (
          <motion.div
            key={card.title}
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduced
                ? { duration: 0 }
                : { delay: i * 0.06, type: "spring", stiffness: 300, damping: 25 }
            }
            whileHover={
              reduced
                ? undefined
                : { y: -4, transition: { type: "spring", stiffness: 400, damping: 25 } }
            }
          >
            <Link
              href={card.href}
              className="group block h-full rounded-2xl bg-card p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className={`inline-flex rounded-xl p-2.5 ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-semibold">{card.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{card.description}</p>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
