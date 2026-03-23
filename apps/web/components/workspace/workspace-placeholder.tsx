import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type WorkspacePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function WorkspacePlaceholder({ eyebrow, title, description }: WorkspacePlaceholderProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Badge variant="outline" className="w-fit">
          <Sparkles className="size-3.5" />
          {eyebrow}
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-600">{description}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PlaceholderCard />
        <PlaceholderCard />
        <PlaceholderCard />
      </div>
    </div>
  );
}

function PlaceholderCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-4 w-28" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-3 w-44" />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-10 w-1/2" />
      </CardContent>
    </Card>
  );
}
