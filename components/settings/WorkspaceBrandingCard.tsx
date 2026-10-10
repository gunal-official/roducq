"use client";

/** Owner-managed workspace logo used in every generated PDF letterhead. */

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";

import { updateWorkspaceLogo } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MAX_WORKSPACE_LOGO_BYTES } from "@/lib/pdf/image-constants";

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The selected image could not be read."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("The selected image could not be read."));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function WorkspaceBrandingCard({
  logoDataUrl,
  isOwner,
}: {
  logoDataUrl: string | null;
  isOwner: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentLogo, setCurrentLogo] = useState(logoDataUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);

    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      setError("Choose a PNG or JPEG image.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > MAX_WORKSPACE_LOGO_BYTES) {
      setError("Choose a logo under 256 KB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setSaving(true);
    try {
      const dataUrl = await readDataUrl(file);
      const result = await updateWorkspaceLogo({ logoDataUrl: dataUrl });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setCurrentLogo(dataUrl);
      setNotice("Logo saved. New PDF exports will use it in the letterhead.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The logo could not be saved.");
    } finally {
      setSaving(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!currentLogo) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await updateWorkspaceLogo({ logoDataUrl: null });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setCurrentLogo(null);
      setNotice("Logo removed. PDF exports will show the workspace name instead.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The logo could not be removed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1 border-b border-border px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="icon-chip icon-chip-muted h-8 w-8">
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
          </span>
          <CardTitle className="text-base">Branding &amp; logo</CardTitle>
        </div>
        <CardDescription>
          Add a small PNG or JPEG to the letterhead on your PDF exports. Maximum
          file size: 256 KB.
          {!isOwner && (
            <span className="italic"> View only — owners manage branding.</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-4">
          {currentLogo ? (
            <div className="flex h-20 w-40 items-center justify-center rounded-md border border-border bg-card p-2">
              <Image
                src={currentLogo}
                alt="Current workspace logo"
                width={144}
                height={64}
                unoptimized
                className="max-h-16 w-auto max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-20 w-40 items-center justify-center rounded-md border border-dashed border-border bg-muted text-muted-foreground">
              <ImagePlus className="h-6 w-6" aria-hidden="true" />
              <span className="sr-only">No workspace logo set</span>
            </div>
          )}

          {isOwner && (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="secondary" size="sm" disabled={saving}>
                <label className="cursor-pointer">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Upload className="h-4 w-4" aria-hidden="true" />
                  )}
                  {saving ? "Saving…" : currentLogo ? "Replace logo" : "Upload logo"}
                  <input
                    ref={inputRef}
                    className="sr-only"
                    type="file"
                    accept="image/png,image/jpeg"
                    aria-label="Upload workspace logo"
                    disabled={saving}
                    onChange={(event) => void handleUpload(event.target.files?.[0])}
                  />
                </label>
              </Button>
              {currentLogo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => void handleRemove()}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remove logo
                </Button>
              )}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-error" role="alert">{error}</p>}
        {notice && <p className="text-xs text-muted-foreground" role="status">{notice}</p>}
      </CardContent>
    </Card>
  );
}
