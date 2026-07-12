// dencat.dev の薄いルーティングWorker。
// 責務は「/chat系の認証ゲート + Service Binding経由でzuisetsu-chatbotへ渡す」ことだけ。
// ChatBotのロジックは一切持ち込まない(Zuisetsu/ChatBot design.md §0)。
// それ以外のリクエストは従来どおり静的アセット配信にフォールバックする。
//
// 認証(design.md §2.1): portal.dencat.devの認証局が発行するauth_tokenクッキー(JWT)を
// HS256で検証する。秘密鍵は `wrangler secret put CHAT_AUTH_JWT_SECRET`(認証局側と同一値)。
// 認可基準(誰を通すか)は認証局側の管轄であり、このファイルには一切書かない。

const LOGIN_URL = "https://portal.dencat.dev/auth/login";

function base64urlToBytes(s) {
	let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
	const pad = b64.length % 4;
	if (pad === 1) throw new Error("invalid base64url");
	if (pad > 0) b64 += "=".repeat(4 - pad);
	const bin = atob(b64);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
}

function getCookie(request, name) {
	for (const part of (request.headers.get("Cookie") ?? "").split(/;\s*/)) {
		const eq = part.indexOf("=");
		if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1);
	}
	return null;
}

// 返り値: { ok: true, payload } | { ok: false, reason: "expired" | "invalid" }
async function verifyJwtHS256(token, secret) {
	const invalid = { ok: false, reason: "invalid" };
	const parts = token.split(".");
	if (parts.length !== 3) return invalid;
	const [h, p, s] = parts;
	let header, payload, sig;
	try {
		header = JSON.parse(new TextDecoder().decode(base64urlToBytes(h)));
		payload = JSON.parse(new TextDecoder().decode(base64urlToBytes(p)));
		sig = base64urlToBytes(s);
	} catch {
		return invalid;
	}
	// alg混同攻撃の禁止: HS256以外は署名検証に進まず拒否する
	if (header.alg !== "HS256") return invalid;
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["verify"],
	);
	const ok = await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(`${h}.${p}`));
	if (!ok) return invalid;
	if (typeof payload.exp !== "number" || payload.exp <= Date.now() / 1000) {
		return { ok: false, reason: "expired" };
	}
	return { ok: true, payload };
}

async function handleChat(request, env, url) {
	// 秘密未投入はフェイルクローズ(リダイレクトループを避けるため503で止める)
	if (!env.CHAT_AUTH_JWT_SECRET) {
		return new Response("auth is not configured", { status: 503 });
	}

	const token = getCookie(request, "auth_token");
	const result = token
		? await verifyJwtHS256(token, env.CHAT_AUTH_JWT_SECRET)
		: { ok: false, reason: "missing" };

	if (!result.ok) {
		// APIはリダイレクトを追わせず401で返す(UI側でログイン誘導する)
		if (url.pathname.startsWith("/chat/api/")) {
			return Response.json({ error: "auth_required" }, { status: 401 });
		}
		// 署名不一致だけは自動リダイレクトしない: 鍵の食い違い時に
		// ログイン→帰還→再失敗の無限ループになるのを防ぎ、手動リンクに留める
		if (result.reason === "invalid") {
			return new Response(
				`<!doctype html><meta charset="utf-8"><p>セッションが無効です。<a href="${LOGIN_URL}?next=${encodeURIComponent(url.href)}">再ログイン</a>してください。</p>`,
				{ status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } },
			);
		}
		// 未ログイン・期限切れは認証局へ(認証後にnextへ帰ってくる)
		return Response.redirect(`${LOGIN_URL}?next=${encodeURIComponent(url.href)}`, 302);
	}

	// 検証済みの身元を下流へ添付(クライアントからの詐称ヘッダは必ず上書きする)
	const headers = new Headers(request.headers);
	headers.set("X-Chat-Discord-Id", String(result.payload.sub ?? ""));
	return env.CHATBOT.fetch(new Request(request, { headers }));
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		if (url.pathname === "/chat" || url.pathname.startsWith("/chat/")) {
			return handleChat(request, env, url);
		}
		return env.ASSETS.fetch(request);
	},
};
