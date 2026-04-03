# Manual Testing Guide for Genre Quality Tests

**Task:** AI-245 - 9장르 스토리 품질 테스트 및 벤치마크 생성
**Date:** 2026-04-03
**Purpose:** Guide for manual story generation and quality testing when automated scripts encounter issues

---

## Quick Start

### Prerequisites
- Backend server running: `./dev.sh start backend`
- Frontend server running: `./dev.sh start frontend` (optional, for UI testing)
- Access to Admin panel at http://localhost:5173/admin
- Gemini API key configured

### Method 1: Using Story Editor UI (Recommended for Small-Scale Testing)

**Steps:**
1. Navigate to http://localhost:5173
2. Click "에디터" (Editor) in the navigation
3. Click "새 스토리 만들기" (New Story)
4. Fill in the story setup:
   - **장르 (Genre):** Select from dropdown
   - **세계관 설정 (World Setting):** Paste the scenario's world_setting
   - **캐릭터 이름 (Character Name):** Enter character_name
   - **캐릭터 설정 (Character Setting):** Paste character_setting
5. Click "게임 시작" (Start Game) to generate the opening narrative
6. Review the generated story
7. Use the quality evaluation rubric to score the story

**Pros:**
- Real user experience testing
- Visual feedback
- Easy to iterate

**Cons:**
- Slower for batch testing
- Manual data entry required

---

### Method 2: Using Admin Panel Prompt Preview

**Steps:**
1. Navigate to http://localhost:5173/admin
2. Login with admin credentials
3. Go to "프롬프트 설정" (Prompt Settings)
4. Select the genre you want to test
5. Review the current prompt configuration
6. Use the "프롬프트 프리뷰" (Prompt Preview) feature to test
7. Generate sample stories for evaluation

**Pros:**
- Faster than UI method
- Direct prompt testing
- Can compare prompt variations

**Cons:**
- Requires admin access
- May not reflect full user journey

---

### Method 3: Direct API Testing with curl

**Setup:**
1. Get auth token from browser DevTools (Application → Local Storage → supabase-auth)
2. Use `/api/game/test-prompt` endpoint

**Example:**
```bash
# Replace YOUR_AUTH_TOKEN with actual token
curl -X POST http://localhost:3000/api/game/test-prompt \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "genre": "판타지",
    "world_setting": "마법 탑 최하층에서 금지된 고대 마법서를 발견한 견습 마법사",
    "character_name": "엘라라",
    "character_setting": "18세, 호기심 많고 재능 있지만 경험 부족"
  }'
```

**Pros:**
- Fastest for batch testing
- Scriptable
- Direct API response

**Cons:**
- Requires auth token management
- Less visual context

---

## Quality Evaluation Rubric

For each generated story, evaluate on 6 dimensions (1-10 scale):

### 1. 장르 정합성 (Genre Compliance) - /10
- **10점:** Perfect genre adherence, all conventions respected
- **7-9점:** Good genre fit, minor deviations acceptable
- **4-6점:** Noticeable genre mismatch or missing elements
- **1-3점:** Major genre violations, doesn't feel like the genre

### 2. 서사 응집성 (Narrative Coherence) - /10
- **10점:** Perfectly coherent, logical flow, consistent world-building
- **7-9점:** Generally coherent, minor plot holes
- **4-6점:** Some inconsistencies or confusing elements
- **1-3점:** Incoherent, contradictory, or confusing

### 3. 캐릭터 개성 (Character Distinctiveness) - /10
- **10점:** Unique voice, distinct personality, believable motivations
- **7-9점:** Good characterization, some uniqueness
- **4-6점:** Generic or flat character, weak voice
- **1-3점:** Stereotypical, inconsistent, or nonexistent personality

### 4. 대화 자연스러움 (Dialogue Naturalness) - /10
- **10점:** Natural, genre-appropriate, character-consistent
- **7-9점:** Generally natural, minor awkwardness
- **4-6점:** Stilted, unnatural, or breaks immersion
- **1-3점:** Cringeworthy, robotic, or inappropriate

### 5. 분위기/톤 적절성 (Atmosphere/Tone) - /10
- **10점:** Perfect mood, immersive, genre-authentic
- **7-9점:** Good atmosphere, minor tonal issues
- **4-6점:** Weak atmosphere or inconsistent tone
- **1-3점:** Wrong tone, breaks immersion

### 6. 기억력 활용 (Memory Usage) - /10
- **10점:** Excellent tracking of all elements, perfect consistency
- **7-9점:** Good memory use, minor forgetfulness
- **4-6점:** Inconsistent tracking, some contradictions
- **1-3점:** Poor memory, frequent contradictions

**Total Maximum:** 60 points
**Passing Score:** 42/60 (70%)
**Excellent Score:** 54/60 (90%)

---

## Test Execution Template

For each scenario tested, record:

```
## [Genre] - [Scenario ID] - [Title]

**Setup:**
- World Setting: [paste]
- Character: [name] - [setting]

**Generated Story:**
[Paste or summarize the generated narrative - first 500-1000 tokens]

**Scores:**
1. 장르 정합성: X/10 - [reasoning]
2. 서사 응집성: X/10 - [reasoning]
3. 캐릭터 개성: X/10 - [reasoning]
4. 대화 자연스러움: X/10 - [reasoning]
5. 분위기/톤 적절성: X/10 - [reasoning]
6. 기억력 활용: X/10 - [reasoning]

**Total:** XX/60 (XX%)

**Qualitative Feedback:**
[General observations, what worked well, what didn't]

**Issues Identified:**
- [List specific issues found]
- [Prompt improvement suggestions]

**Pass/Fail:** [PASS if ≥42/60, FAIL if <42/60]
```

---

## Recommended Testing Approach

### Phase 1: Validation Testing (9 scenarios)
Test 1 scenario from each genre to validate approach:
- F1-Basic (Fantasy)
- MO1-Basic (Modern)
- MU1-Basic (Martial Arts)
- R1-Basic (Romance)
- H1-Basic (Horror)
- S1-Basic (Sci-Fi)
- MY1-Basic (Mystery)
- HI1-Basic (History)
- P1-Basic (Psychological)

### Phase 2: Comprehensive Testing (remaining 18 scenarios)
Based on Phase 1 results, decide:
- If all pass: Continue with full testing
- If issues found: Fix prompts first, then re-test

---

## Troubleshooting

### Issue: "API key not found"
**Solution:** Check `.env` file for `GEMINI_API_KEY` or `GEMINI_API` variable

### Issue: "Authentication required"
**Solution:** Login through the UI and get auth token from browser storage

### Issue: "Generated story is empty"
**Solution:** Check backend logs, verify Gemini API is accessible

### Issue: "Story doesn't match genre"
**Solution:** Check prompt settings in admin panel, verify genre-specific prompts are loaded

---

## Next Steps After Testing

1. Compile results into test-execution-log.md
2. Identify patterns in failures
3. Create genre-quality-benchmarks.md with best examples
4. Generate improvement recommendations (P0/P1/P2)
5. Update prompts based on findings

---

**Document Status:** ✅ Ready for use
**Last Updated:** 2026-04-03
