import { verifySessionAccess } from '../../plugins/auth.js';
export default async function (app) {
    app.get('/sessions/:id/memory', async (request) => {
        const { id } = request.params;
        await verifySessionAccess(app, request, id);
        const { data } = await app.supabaseAdmin
            .from('session_memory')
            .select('type, content')
            .eq('session_id', id);
        const memory = { shortTerm: [], longTerm: [], characters: [], goals: '' };
        for (const row of data || []) {
            if (row.type === 'short_term')
                memory.shortTerm = row.content;
            else if (row.type === 'long_term')
                memory.longTerm = row.content;
            else if (row.type === 'characters')
                memory.characters = row.content;
            else if (row.type === 'goals')
                memory.goals = typeof row.content === 'string' ? row.content : JSON.stringify(row.content);
        }
        return memory;
    });
}
//# sourceMappingURL=memory.js.map