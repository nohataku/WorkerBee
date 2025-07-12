class PasswordUtils {
    constructor() {
        this.passwordSalt = 'workerbee2025salt';
    }

    // SHA-256ハッシュ化関数
    async sha256(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // パスワードハッシュ化関数
    async hashPassword(password) {
        return await this.sha256(password + this.passwordSalt);
    }
}
