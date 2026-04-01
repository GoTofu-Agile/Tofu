import { cn } from "@/lib/utils";
import { getPersonaAvatarDataUri } from "@/lib/personas/dicebear-persona-avatar";

export type PersonaSquircleInput = {
  id: string;
  name: string;
  gender?: string | null;
  occupation?: string | null;
  archetype?: string | null;
  age?: number | null;
};

/** `lg` = group grid card header; `xl` = persona detail hero (after opening the card). */
type PersonaSquircleIconProps = {
  persona: PersonaSquircleInput;
  size?: "lg" | "xl";
  className?: string;
  "aria-hidden"?: boolean;
};

const SIZE_CONFIG = {
  lg: { box: "h-14 w-14", pixelSize: 112, display: 56 },
  xl: { box: "h-24 w-24 sm:h-28 sm:w-28", pixelSize: 160, display: 112 },
} as const;

export function PersonaSquircleIcon({
  persona,
  size = "lg",
  className,
  "aria-hidden": ariaHidden = true,
}: PersonaSquircleIconProps) {
  const { box, pixelSize, display } = SIZE_CONFIG[size];
  const src = getPersonaAvatarDataUri({
    personaId: persona.id,
    pixelSize,
    gender: persona.gender,
    occupation: persona.occupation,
  });

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-[28%] border border-black/10 bg-muted/30 shadow-sm dark:border-white/15",
        box,
        className
      )}
      aria-hidden={ariaHidden}
      {...(!ariaHidden
        ? { role: "img" as const, "aria-label": `${persona.name} avatar` }
        : {})}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- data URI from DiceBear SVG */}
      <img
        src={src}
        alt=""
        width={display}
        height={display}
        className="h-full w-full object-cover object-top"
        draggable={false}
      />
    </div>
  );
}
