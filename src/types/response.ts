interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  result: T;
}

type EmptyResult = Record<string, never>;

export type { ApiResponse, EmptyResult };
