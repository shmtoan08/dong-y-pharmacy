/**
 * Kiểu dữ liệu phản hồi chuẩn cho toàn bộ Server Actions trong dự án.
 * Hỗ trợ cả cú pháp mới { ok, data } và cú pháp cũ { success, error } để đảm bảo tương thích ngược 100%.
 */
export type ActionResult<T = unknown> =
  | {
      ok: true;
      success: true;
      data: T;
      message?: string;
      error?: never;
      code?: never;
    }
  | {
      ok: false;
      success: false;
      error: string;
      code?: string;
      data?: never;
      message?: never;
    };

export interface ActionState<T = unknown> {
  ok?: boolean;
  success?: boolean;
  error?: string;
  data?: T;
  message?: string;
  code?: string;
  name?: string;
  [key: string]: unknown;
}

/**
 * Helper tạo phản hồi thành công
 */
export function actionSuccess<T>(data: T, message?: string): ActionResult<T> {
  return {
    ok: true,
    success: true,
    data,
    message,
  };
}

/**
 * Helper tạo phản hồi thất bại
 */
export function actionError(error: string, code?: string): ActionResult<never> {
  return {
    ok: false,
    success: false,
    error,
    code,
  };
}
