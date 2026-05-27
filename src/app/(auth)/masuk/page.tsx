"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Butang } from "@/components/ui/butang";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const skemaMasuk = z.object({
  email: z.string().email("Email tidak sah"),
  kata_laluan: z.string().min(6, "Kata laluan minimum 6 aksara"),
});

type DataMasuk = z.infer<typeof skemaMasuk>;

export default function HalamanMasuk() {
  const router = useRouter();
  const [ralat, setRalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DataMasuk>({ resolver: zodResolver(skemaMasuk) });

  async function onSubmit(data: DataMasuk) {
    setMemuat(true);
    setRalat(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.kata_laluan,
    });
    if (error) {
      setRalat(error.message);
      setMemuat(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log Masuk</CardTitle>
        <CardDescription>
          Masukkan email dan kata laluan akaun auditor anda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="auditor@risda.gov.my"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="kata_laluan">Kata Laluan</Label>
            <Input
              id="kata_laluan"
              type="password"
              autoComplete="current-password"
              {...register("kata_laluan")}
            />
            {errors.kata_laluan && (
              <p className="text-xs text-destructive">
                {errors.kata_laluan.message}
              </p>
            )}
          </div>

          {ralat && (
            <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {ralat}
            </p>
          )}

          <Butang type="submit" className="w-full" disabled={memuat}>
            {memuat ? "Sedang masuk..." : "Log Masuk"}
          </Butang>

          <p className="text-center text-sm text-muted-foreground">
            Belum ada akaun?{" "}
            <Link href="/daftar" className="text-primary hover:underline">
              Daftar di sini
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
