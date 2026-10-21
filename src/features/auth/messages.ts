export function validateCredentials(email: string, password: string, signup: boolean): string | null {
  if (!email.trim()) return 'Bạn chưa nhập email.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Email chưa đúng định dạng. Bạn kiểm tra lại nhé.';
  if (!password) return 'Bạn chưa nhập mật khẩu.';
  if (signup && password.length < 6) return 'Mật khẩu tạo tài khoản cần ít nhất 6 ký tự.';
  return null;
}

export function authErrorMessage(error: unknown): string {
  const details = error && typeof error === 'object' ? error as { code?: string; name?: string; status?: number; message?: string } : {};
  switch (details.code) {
    case 'invalid_credentials':
      return 'Email chưa đăng ký hoặc email, mật khẩu chưa đúng. Bạn kiểm tra lại thông tin; nếu chưa có tài khoản, chọn “Tạo tài khoản”.';
    case 'user_not_found':
      return 'Tài khoản chưa được đăng ký. Bạn chọn “Tạo tài khoản” để bắt đầu nhé.';
    case 'email_not_confirmed':
      return 'Email chưa được xác nhận. Bạn mở email xác nhận tài khoản rồi quay lại đăng nhập nhé.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Email này đã được đăng ký. Bạn chọn “Đăng nhập” và nhập mật khẩu của mình nhé.';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Email hoặc thông tin đăng nhập chưa hợp lệ. Bạn kiểm tra lại nhé.';
    case 'weak_password':
      return 'Mật khẩu chưa đủ mạnh. Bạn dùng ít nhất 6 ký tự, kết hợp chữ hoa, chữ thường và số nhé.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Bạn đã thử quá nhiều lần. Vui lòng chờ một lát rồi thử lại.';
    case 'signup_disabled':
      return 'Tính năng tạo tài khoản đang tạm đóng. Bạn thử lại sau nhé.';
    case 'user_banned':
      return 'Tài khoản đang bị tạm khóa. Bạn liên hệ hỗ trợ để được kiểm tra nhé.';
  }
  if (details.status === 429) return 'Bạn đã thử quá nhiều lần. Vui lòng chờ một lát rồi thử lại.';
  if (details.name === 'AuthRetryableFetchError' || /network|failed to fetch|fetch failed/i.test(details.message ?? '')) {
    return 'Chưa kết nối được máy chủ. Bạn kiểm tra kết nối mạng rồi thử lại nhé.';
  }
  return 'Chưa thể kết nối tài khoản lúc này. Bạn thử lại sau nhé.';
}
