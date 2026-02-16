import AmsComponent from "@/components/AmsComponent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrentSpool } from "@/components/tray-config/CurrentSpool";
import { getSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { headers } from "next/headers";

function SkeletonPage() {
  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>Home</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="mt-6">
        <h1 className="text-2xl font-semibold mb-4">
          BambuLab Spoolman Integration
        </h1>
        <Card>
          <CardHeader>
            <CardTitle>
              <Skeleton className="w-20 h-6" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="w-full h-32" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

async function ExternalSpoolConfiguration() {
  const settings = await getSettings();
  const externalSpoolId = settings.trays[255];
  return (
    <div className="flex mb-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>External Spool Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {externalSpoolId != null ? (
            <Link href="/external-spool" className="w-full">
              <CurrentSpool trayId={255} showClearButton={false} />
            </Link>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/external-spool">Configure</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function AmsConfiguration() {
  const settings = await getSettings();
  const trayCount = settings.trayCount;
  const amsCount = Math.ceil(trayCount / 4);
  const components = [];
  for (let i = 0; i < amsCount; i++) {
    components.push(<AmsComponent key={i} id={i} />);
  }
  return components;
}

async function HomePage() {
  // Force the page to be dynamic
  await headers();
  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>Home</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="mt-6">
        <h1 className="text-2xl font-semibold mb-4">
          BambuLab Spoolman Integration
        </h1>
        <ExternalSpoolConfiguration />
        <div className="flex flex-col gap-4">
          <AmsConfiguration />
        </div>
      </div>
    </>
  );
}

export default async function Home() {
  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Suspense fallback={<SkeletonPage />}>
        <HomePage />
      </Suspense>
    </div>
  );
}
