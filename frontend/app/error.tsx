"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container mx-auto flex max-w-2xl flex-1 items-center p-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            The page could not be loaded. Check the server logs for more
            information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error.digest ? (
            <p className="text-sm text-muted-foreground">
              Error reference: {error.digest}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={reset}>
              Try again
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
            >
              Go back
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
