import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CurrentSpool } from "../../../../../components/tray-config/CurrentSpool";
import { SpoolConfiguration } from "./SpoolConfiguration";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

type Props = PageProps<"/ams/[amsId]/tray/[trayId]">;

function SkeletonPage() {
  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>Home</BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Skeleton className="w-20 h-5" />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Skeleton className="w-20 h-5" />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Current Spool</CardTitle>
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

async function TrayPage(props: Props) {
  const params = await props.params;
  const amsId = Number(params.amsId) - 1;
  const trayId = Number(params.trayId) - 1; // Convert to 0-indexed
  if (trayId < amsId * 4 || trayId >= amsId * 4 + 4) {
    notFound();
  }
  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>Home</BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>AMS {amsId + 1}</BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>Tray {(trayId % 4) + 1}</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Current Spool</CardTitle>
        </CardHeader>
        <CardContent>
          <CurrentSpool amsId={amsId} trayId={trayId} />
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Select Spool</CardTitle>
        </CardHeader>
        <CardContent>
          <SpoolConfiguration amsId={amsId} trayId={trayId} />
          <Button variant="outline" className="mt-4 float-left" asChild>
            <Link href="/">Back</Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

export default async function TrayPageOuter(props: Props) {
  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Suspense fallback={<SkeletonPage />}>
        <TrayPage {...props} />
      </Suspense>
    </div>
  );
}
