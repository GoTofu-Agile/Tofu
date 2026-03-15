import { requireAuth } from "@/lib/auth";
import { PersonaCreationFlow } from "@/components/personas/creation/persona-creation-flow";

export default async function NewPersonaGroupPage() {
  await requireAuth();

  return <PersonaCreationFlow />;
}
