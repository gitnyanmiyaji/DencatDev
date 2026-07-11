// dencat.dev の薄いルーティングWorker。
// 責務は「/chat系をService Binding経由でzuisetsu-chatbotへ渡す」ことだけ。
// ChatBotのロジックは一切持ち込まない(Zuisetsu/ChatBot design.md §0)。
// それ以外のリクエストは従来どおり静的アセット配信にフォールバックする。
export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		if (url.pathname === "/chat" || url.pathname.startsWith("/chat/")) {
			return env.CHATBOT.fetch(request);
		}
		return env.ASSETS.fetch(request);
	},
};
