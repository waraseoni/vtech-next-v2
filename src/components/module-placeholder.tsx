import { Construction } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  phase: string;
};

export function ModulePlaceholder({
  title,
  description,
  phase,
}: ModulePlaceholderProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <span className="bg-muted text-muted-foreground mb-2 grid size-10 place-items-center rounded-lg">
            <Construction className="size-5" aria-hidden />
          </span>
          <div className="flex items-center gap-2">
            <CardTitle>{title}</CardTitle>
            <Badge variant="secondary">{phase}</Badge>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
