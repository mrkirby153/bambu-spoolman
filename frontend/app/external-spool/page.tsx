import { CurrentSpool } from "@/components/tray-config/CurrentSpool";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpoolConfiguration } from "../ams/[amsId]/tray/[trayId]/SpoolConfiguration";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { headers } from "next/headers";

function SkeletonPage() {
  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>External Spool</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-24" />
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Select Spool</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-48" />
          <Button variant="outline" className="mt-4 float-left" asChild>
            <Link href="/">Back</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

async function ExternalSpoolConfiguration() {
  // Force the page to be dynamic
  await headers();
  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>External Spool</CardTitle>
        </CardHeader>
        <CardContent>
          <CurrentSpool trayId={255} />
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Select Spool</CardTitle>
        </CardHeader>
        <CardContent>
          <SpoolConfiguration trayId={255} />
          <Button variant="outline" className="mt-4 float-left" asChild>
            <Link href="/">Back</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

export default async function ExternalSpoolPage() {
  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Suspense fallback={<SkeletonPage />}>
        <ExternalSpoolConfiguration />
      </Suspense>
    </div>
  );
}
