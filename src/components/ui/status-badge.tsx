import { Badge } from "@/components/ui/badge";

export function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "success" : "secondary"}>
    <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{active ? "Activa" : "Inactiva"}
  </Badge>;
}
