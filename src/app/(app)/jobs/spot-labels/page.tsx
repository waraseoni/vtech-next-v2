import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { SpotLabelsSheet } from "@/components/jobs/spot-labels-sheet";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getJobSpots } from "@/lib/data/job-operations";

export const metadata = { title: "Spot labels" };

export default async function SpotLabelsPage() {
  const spots = await getJobSpots();

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2 print:hidden"
        >
          <Link href="/jobs">
            <ArrowLeft className="size-4" aria-hidden />
            Jobsheet
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight print:hidden">
          Spot labels
        </h2>
        <p className="text-muted-foreground mt-1 text-sm print:hidden">
          Har job spot ka printable QR label. QR scan karke us spot ki jobs
          direct dekhein.
        </p>
      </div>

      {spots.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Koi spot nahi</CardTitle>
            <CardDescription>
              Pehle job form ya detail page se naya spot banayein.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/jobs/new">New job</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <SpotLabelsSheet spots={spots} />
      )}
    </div>
  );
}
