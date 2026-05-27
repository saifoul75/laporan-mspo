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

const skemaDaftar = z
  .object({
    nama_penuh: z.string().min(3, "Nama penuh minimum 3 aksara"),
    email: z.string().email("Email tidak sah"),
    kata_laluan: z.string().min(6, "Kata laluan minimum 6 aksara"),
    sahkan_kata_laluan: z.string(),
  })
  .refine((d) => d.kata_laluan === d.sahkan_kata_laluan, {
    message: "Kata laluan tidak sepadan",
    path: ["sahkan_kata_laluan"],
  });

type DataDaftar = z.infer<typeof skemaDaftar>;

export default function HalamanDaftar() {
  const router = useRouter();
  const [ralat, setRalat] = useState<string | null>(null);
  const [berjaya, setBerjaya] = useState(false);
  const [memuat, setMemuat] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DataDaftar>({ resolver: zodResolver(skemaDaftar) });

  async function onSubmit(data: DataDaftar) {
    setMemuat(true);
    setRalat(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.kata_laluan,
      options: {
        data: { nama_penuh: data.nama_penuh, rol: "auditor" },
      },
    });
    if (error) {
      setRalat(error.message);
      setMemuat(false);
      return;
    }
    setBerjaya(true);
    setMemuat(false);
    setTimeout(() => router.push("/masuk"), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Akaun</CardTitle>
        <CardDescription>
          Cipta akaun auditor untuk mula menggunakan sistem.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {berjaya ? (
          <div className="space-y-4 text-center">
            <p className="text-sm">
              Akaun berjaya didaftar. Sila semak email untuk pengesahan.
              Mengalihkan ke halaman log masuk...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama_penuh">Nama Penuh</Label>
              <Input
                id="nama_penuh"
                placeholder="Nama seperti dalam IC"
                {...register("nama_penuh")}
              />
              {errors.nama_penuh && (
                <p className="text-xs text-destructive">
                  {errors.nama_penuh.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="kata_laluan">Kata Laluan</Label>
              <Input
                id="kata_laluan"
                type="password"
                autoComplete="new-password"
                {...register("kata_laluan")}
              />
              {errors.kata_laluan && (
                <p className="text-xs text-destructive">
                  {errors.kata_laluan.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sahkan_kata_laluan">Sahkan Kata Laluan</Label>
              <Input
                id="sahkan_kata_laluan"
                type="password"
                autoComplete="new-password"
                {...register("sahkan_kata_laluan")}
              />
              {errors.sahkan_kata_laluan && (
                <p className="text-xs text-destructive">
                  {errors.sahkan_kata_laluan.message}
                </p>
              )}
            </div>

            {ralat && (
              <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                {ralat}
              </p>
            )}

            <Butang type="submit" className="w-full" disabled={memuat}>
              {memuat ? "Sedang mendaftar..." : "Daftar"}
            </Butang>

            <p className="text-center text-sm text-muted-foreground">
              Sudah ada akaun?{" "}
              <Link href="/masuk" className="text-primary hover:underline">
                Log masuk
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
