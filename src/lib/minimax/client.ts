import { z } from "zod";

import { MiniMaxError, RetryableError } from "./errors";
import { withRetry, type RetryOptions } from "./retry";
import {
  TRANSIENT_STATUS_CODES,
  type CallMiniMaxOptions,
  type MiniMaxChoice,
  type MiniMaxResponse,
} from "./types";

// Skema untuk validate bahagian choices — pastikan ia wujud dan bukan kosong.
const baseRespSchema = z.object({
  status_code: z.number(),
  status_msg: z.string(),
});

const choiceSchema = z.object({
  index: z.number(),
  message: z.object({
    role: z.string(),
    content: z.string(),
  }),
  finish_reason: z.string().nullable().optional(),
});

const responseSchema = z.object({
  base_resp: baseRespSchema,
  model: z.string().optional(),
  id: z.string().optional(),
  created: z.number().optional(),
  choices: z.array(choiceSchema).min(1, "Tiada choices dalam respons MiniMax"),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
    })
    .optional(),
});

export const DEFAULT_BASE_URL = "https://api.MiniMax.chat";

export interface CallMiniMaxConfig {
  baseUrl?: string;
  retry?: RetryOptions;
}

export async function callMiniMax<TBody, TChoice = MiniMaxChoice>(
  options: CallMiniMaxOptions<TBody>,
  config: CallMiniMaxConfig = {},
): Promise<MiniMaxResponse<TChoice>> {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const url = `${baseUrl.replace(/\/$/, "")}${options.endpoint}`;

  return withRetry(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey}`,
        ...(options.extraHeaders ?? {}),
      },
      body: JSON.stringify(options.body),
      signal: options.signal,
      cache: "no-store",
    });

    // Ralat HTTP (bukan 2xx) → Ralat boleh dicuba semula jika 5xx / rangkaian
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status >= 500 || res.status === 408 || res.status === 429) {
        throw new RetryableError(
          `MiniMax HTTP ${res.status}: ${text.slice(0, 200) || res.statusText}`,
        );
      }
      throw new MiniMaxError(
        `MiniMax HTTP ${res.status}: ${text.slice(0, 200) || res.statusText}`,
        res.status,
      );
    }

    // Parse JSON dengan pengesahan struktur
    let json: unknown;
    try {
      json = await res.json();
    } catch (err) {
      throw new MiniMaxError("Gagal menghurai JSON respons MiniMax", undefined, err);
    }

    const parsed = responseSchema.safeParse(json);
    if (!parsed.success) {
      // Struktur tak sah → bukan sementara
      throw new MiniMaxError(
        `Struktur respons MiniMax tak sah: ${parsed.error.issues[0]?.message ?? "unknown"}`,
      );
    }

    const { base_resp } = parsed.data;

    // 1) Semak base_resp dahulu — ralat sebenar dari MiniMax
    if (base_resp.status_code !== 0) {
      if (TRANSIENT_STATUS_CODES.includes(base_resp.status_code)) {
        throw new RetryableError(
          `MiniMax transient ${base_resp.status_code}: ${base_resp.status_msg}`,
        );
      }
      throw new MiniMaxError(
        `MiniMax error ${base_resp.status_code}: ${base_resp.status_msg}`,
        base_resp.status_code,
      );
    }

    // 2) Barulah sahkan choices (skema sudah .min(1), tapi tegas di sini)
    if (!parsed.data.choices || parsed.data.choices.length === 0) {
      throw new MiniMaxError("Respons MiniMax berjaya tapi tiada choices");
    }

    return parsed.data as MiniMaxResponse<TChoice>;
  }, config.retry, options.signal);
}
