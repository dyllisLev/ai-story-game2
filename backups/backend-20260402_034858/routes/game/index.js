import startRoute from './start.js';
import chatRoute from './chat.js';
import testPromptRoute from './test-prompt.js';
export default async function gameRoutes(app) {
    await app.register(startRoute);
    await app.register(chatRoute);
    await app.register(testPromptRoute);
}
//# sourceMappingURL=index.js.map