// Jenis respons MiniMax (API chat completion)
// base_resp.status_code = 0 bermaksud berjaya.
// 1000/1002/1027 = ralat sementara, patut dicuba semula.

export interface MiniMaxBaseResp {
  status_code: number;
  status_msg: string;
}

export interface MiniMaxChoice {
  index: number;
  message: {
    role: "assistant" | "user" | "system";
    content: string;
  };
  finish_reason?: string | null;
}

export interface MiniMaxUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface MiniMaxSuccess<TChoice = MiniMaxChoice> {
  base_resp: MiniMaxBaseResp;
  model?: string;
  id?: string;
  created?: number;
  choices: TChoice[];
  usage?: MiniMaxUsage;
}

export type MiniMaxResponse<TChoice = MiniMaxChoice> = MiniMaxSuccess<TChoice>;

// Senarai kod ralat yang dianggap sementara (perlu retry)
export const TRANSIENT_STATUS_CODES: readonly number[] = [1000, 1002, 1027] as const;

// Pilihan pemanggil
export interface CallMiniMaxOptions<TBody> {
  endpoint: string;
  body: TBody;
  apiKey: string;
  signal?: AbortSignal;
  // Tambah header khas jika perlu (cth. group_id)
  extraHeaders?: Record<string, string>;
}
