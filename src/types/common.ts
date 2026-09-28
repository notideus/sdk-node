export interface BatchItemError {
  code: string;
  message: string;
}

export type BatchItemResult =
  | { index: number; id: string }
  | { index: number; error: BatchItemError };
