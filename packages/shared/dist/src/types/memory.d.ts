export interface ShortTermEntry {
    title: string;
    content: string;
}
export interface LongTermEntry {
    title: string;
    content: string;
}
export interface CharacterEntry {
    name: string;
    role: string;
    description: string;
}
export type MemoryType = 'short_term' | 'long_term' | 'characters' | 'goals';
export interface SessionMemory {
    shortTerm: ShortTermEntry[];
    longTerm: LongTermEntry[];
    characters: CharacterEntry[];
    goals: string;
}
//# sourceMappingURL=memory.d.ts.map