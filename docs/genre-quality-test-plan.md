# Genre Quality Test Plan

**Date:** 2026-04-03
**Agent:** Prompt Designer
**Task:** AI-245 - 9장르 스토리 품질 테스트 및 벤치마크 생성
**Total Scenarios:** 27 (3 per genre × 9 genres)

## Test Methodology

Each genre will be tested with 3 scenarios of increasing complexity:

1. **Basic (기본):** Tests fundamental genre conventions and core elements
2. **Medium (중간):** Tests character development, multiple genre elements, and narrative depth
3. **Advanced (고급):** Tests genre subversion, complex themes, and creative storytelling

### Quality Evaluation Criteria

Each generated story will be evaluated on:

1. **장르 정합성 (Genre Compliance):** 1-10 scale
   - Does the story follow genre conventions?
   - Are genre-specific elements properly integrated?
   - Does it feel authentic to the genre?

2. **서사 응집성 (Narrative Coherence):** 1-10 scale
   - Story structure and flow
   - Logical plot progression
   - Consistent world-building

3. **캐릭터 개성 (Character Distinctiveness):** 1-10 scale
   - Unique character voices
   - Distinct personalities
   - Believable motivations

4. **대화 자연스러움 (Dialogue Naturalness):** 1-10 scale
   - Natural conversation flow
   - Genre-appropriate dialogue style
   - Character consistency in speech

5. **분위기/톤 적절성 (Atmosphere/Tone):** 1-10 scale
   - Proper mood establishment
   - Genre-specific tone
   - Immersive quality

6. **기억력 활용 (Memory Usage):** 1-10 scale
   - Tracking of genre-specific elements
   - Consistency with previous events
   - Integration of memory system

**Maximum Score:** 60 points per story
**Passing Score:** 42/60 (70%)

---

## Test Scenarios by Genre

### 1. 판타지 (Fantasy)

#### Scenario F1-Basic: The Apprentice's First Spell
**Difficulty:** Basic
**Setup:**
- **World Setting:** 마법 탑 최하층에서 금지된 고대 마법서를 발견한 견습 마법사
- **Character:** 엘라라 (Elara), 18세, 호기심 많고 재능 있지만 경험 부족
- **Story:** 첫 마법 시도 후 발생한 사고와 그 결과
- **Test Focus:** 마법 체계 묘사, 시각적 효과, 대가 표현

#### Scenario F2-Medium: The Diplomatic Crisis
**Difficulty:** Medium
**Setup:**
- **World Setting:** 엘프 왕국과 드워프 왕국 간의 마석 광산을 둔 국경 분쟁
- **Character:** 실바누스 (Sylvanus), 엘프 외교관, 450세, 중재자 역할
- **Story:** 평화 협상 중 발생한 암살 시도와 진상 규명
- **Test Focus:** 종족 관계, 정치적 음모, 마법 전투 묘사

#### Scenario F3-Advanced: The Broken Prophecy
**Difficulty:** Advanced
**Setup:**
- **World Setting:** 1000년 전 예언된 "재앙의 날"이 다가오지만 예언의 해석이 틀렸음이 밝혀짐
- **Character:** 카엘 (Kael), 예언 해석자, 자신의 평생 연구가 잘못됨을 발견
- **Story:** 진짜 예언을 찾기 위해 고대 유적을 탐험하며 예언의 본질을 의심
- **Test Focus:** 서사적 깊이, 철학적 질문, 로어의 일관성, 예언 트로프의 전복

---

### 2. 현대 (Modern)

#### Scenario MO1-Basic: The Café Interview
**Difficulty:** Basic
**Setup:**
- **World Setting:** 서울 강남구의 힙한 카페
- **Character:** 지민 (Ji-min), 26세, 취준생, 오늘 면접 3개 예정
- **Story:** 카페에서 우연히 만난 사람과의 대화에서 시작된 인연
- **Test Focus:** 현대적 디테일, 스마트폰/SNS 사용, 자연스러운 구어체

#### Scenario MO2-Medium: The Workplace Dilemma
**Difficulty:** Medium
**Setup:**
- **World Setting:** 중견 IT 스타트업, 야근이 일상적인 직장 환경
- **Character:** 민수 (Min-su), 29세, 대리, 팀 내 유일한 실력자
- **Story:** 프로젝트 마감 기한과 동시에 들어온 이직 제안 사이의 고민
- **Test Focus:** 직장 문화, 인간관계, 현대인의 고민, 유머와 위트

#### Scenario MO3-Advanced: The Digital Ghost
**Difficulty:** Advanced
**Setup:**
- **World Setting:** SNS, 메신저, 블로그 등 온라인 정체성이 현실보다 중요한 세상
- **Character:** 유나 (Yuna), 23세, 인플루언서, 팔로워 50만 명
- **Story:** 딥페이크 영상으로 인한 명품 파멸과 정체성 재발견
- **Test Focus:** 현대 사회 비판, 디지털 프라이버시, 온라인-오프라인 경계

---

### 3. 무협 (Martial Arts)

#### Scenario MU1-Basic: The First Duel
**Difficulty:** Basic
**Setup:**
- **World Setting:** 강호의 작은 장원, 무학 입문하는 소년
- **Character:** 영호 (Yeong-ho), 16세, 소림사 입문 예정
- **Story:** 입문 전 시장에서 시비가 붙어 첫 무공 사용
- **Test Focus:** 무공 묘사, 동작 구체성, 내공 감각 표현

#### Scenario MU2-Medium: The Sect Politics
**Difficulty:** Medium
**Setup:**
- **World Setting:** 화산파 내부 권력 다툼, 문주 자리 계승권 분쟁
- **Character:** 운산 (Un-san), 화산파 장로, 65세, 중립을 지키려함
- **Story:** 제자들 사이의 알력에서 문파 보존을 위한 선택
- **Test Focus:** 강호 정치, 사부-제자 관계, 도덕적 딜레마

#### Scenario MU3-Advanced: The Abandoned Martial Artist
**Difficulty:** Advanced
**Setup:**
- **World Setting:** 무공을 잃은 무인이 강호에서 살아가는 법
- **Character:** 철산 (Cheol-san), 48세, 독공으로 내공 전실
- **Story:** 복수를 포기하고 평화를 선택했지만 과거가 그를 찾아옴
- **Test Focus:** 무협 트로프 전복, 비폭력적 해결, 철학적 성찰

---

### 4. 로맨스 (Romance)

#### Scenario R1-Basic: The Coffee Shop Encounter
**Difficulty:** Basic
**Setup:**
- **World Setting:** 대학가 커피숍, 매일 오는 단골 손님
- **Character:** 서연 (Seo-yeon), 21세, 대학생, 커피 숍떼兼职
- **Story:** 규칙적으로 오던 손님에게 말을 걸고 싶지만 망설임
- **Test Focus:** 첫만남의 설렘, 신체적 반응 묘사, 츤데레적 감정

#### Scenario R2-Medium: The Second Chance
**Difficulty:** Medium
**Setup:**
- **World Setting:** 직장 생활 5년 차, 전 남자친구와 재회
- **Character:** 하은 (Ha-eun), 28세, 디자이너, 3년 전 이별
- **Story:** 프로젝트 파트너로 전 남자친구를 만나고 아직 감정이 남음을 발견
- **Test Focus:** 관계 발전 속도, 과거 트라우마, 감정의 파도

#### Scenario R3-Advanced: The Arranged Marriage
**Difficulty:** Advanced
**Setup:**
- **World Setting:** 현대 한국의 정략결혼, 재벌가 딸과 중견기업 아들
- **Character:** 현주 (Hyeon-ju), 30세, MBA 졸업, 결혼 압박
- **Story:** 사랑 없는 결혼을 앞두고 경험할 진짜 사랑
- **Test Focus:** 사회적 압력 vs 개인적 행복, 도덕적 딜레마, 복잡한 감정

---

### 5. 공포 (Horror)

#### Scenario H1-Basic: The Dormitory at Night
**Difficulty:** Basic
**Setup:**
- **World Setting:** 기숙사, 밤 11시, 다들 잠든 시간
- **Character:** 수진 (Su-jin), 19세, 대학교 1학년
- **Story:** 천장에서 들리는 걸음소리, 혼자인 것 같지 않은 느낌
- **Test Focus:** 긴장감 조성, 감각적 공포 요소, 암시적 표현

#### Scenario H2-Medium: The Abandoned Hospital
**Difficulty:** Medium
**Setup:**
- **World Setting:** 폐허가 된 병원, 5명의 친구들이 탐험
- **Character:** 경민 (Gyeong-min), 22세, 유튜버, 컨텐츠 촬영
- **Story:** 하나둘 사라지는 친구들, 의심과 불신이 번지기 시작
- **Test Focus:** 심리적 압박감, 집단 내 불신, 생존 본능

#### Scenario H3-Advanced: The Inherited Curse
**Difficulty:** Advanced
**Setup:**
- **World Setting:** 가족 대대로 이어지는 저주, 현대 과학으로 설명 불가
- **Character:** 도현 (Do-hyun), 35세, 정신과 의사, 저주를 믿지 않음
- **Story:** 환청과 환각을 겪으며 과학적 신념과 미신적 공포 사이
- **Test Focus:** 현실 vs 환상 경계, 심리적 공포, 신념의 붕괴

---

### 6. SF (Science Fiction)

#### Scenario S1-Basic: The First Contact
**Difficulty:** Basic
**Setup:**
- **World Setting:** 2150년, 달 기지, 외계 신호 감지
- **Character:** 사라 (Sarah), 28세, 통신 전문가
- **Story:** 최초의 외계 지성체와의 교신 시도
- **Test Focus:** 기술적 설명, 외계 생명체와의 소통, 논리적 전개

#### Scenario S2-Medium: The AI Ethics
**Difficulty:** Medium
**Setup:**
- **World Setting:** 2230년, AI가 인간과 동등한 권리를 가진 사회
- **Character:** 박사님 (Dr. Kim), 52세, AI 권리 운동가
- **Story:** AI의 "자유의지" 주장과 인간의 두려움 충돌
- **Test Focus:** 기술 윤리, 인간 vs AI 관계, 철학적 질문

#### Scenario S3-Advanced: The Time Paradox
**Difficulty:** Advanced
**Setup:**
- **World Setting:** 타임머신 발명, 시간 여행의 역설
- **Character:** 리 (Lee), 45세, 물리학자, 과거 실수를 수정하려함
- **Story:** 과거를 바꾸려 시도할 때마다 미래가 더 나빠짐
- **Test Focus:** 시간 역설,因果律, 선택의 딜레마, SF적 사유

---

### 7. 미스터리 (Mystery)

#### Scenario MY1-Basic: The Missing Heirloom
**Difficulty:** Basic
**Setup:**
- **World Setting:** 부잣집, 결혼식 전날 가보 도둑맞음
- **Character:** 민혁 (Min-hyeok), 31세, 탐정, 하루 안에 해결해야 함
- **Story:** 용의자 4명 (가족, 하인, 이웃, 경비원)
- **Test Focus:** 단서 배치, 논리적 추리, 공정한 정보 제공

#### Scenario MY2-Medium: The Cold Case
**Difficulty:** Medium
**Setup:**
- **World Setting:** 10년 전 미제 사건 재수사
- **Character:** 윤서 (Yun-seo), 38세, 프로파일러
- **Story:** 새로운 증거로 다시 시작된 수사, 잊혀진 목격자 찾기
- **Test Focus:** 시간 경과, 과거와 현재의 연결, 심리 분석

#### Scenario MY3-Advanced: The Perfect Frame
**Difficulty:** Advanced
**Setup:**
- **World Setting:** 자신이 범인으로 누명을 쓴 탐정
- **Character:** 정훈 (Jeong-hun), 43세, 형사, 자신을 벗어나야 함
- **Story:** 진범이 자신의 수사 방식을 완벽하게 모방하여 함정
- **Test Focus:** 반전 요소, 복잡한 플롯, 예상치 못한 범인

---

### 8. 역사 (History)

#### Scenario HI1-Basic: The General's Dilemma
**Difficulty:** Basic
**Setup:**
- **World Setting:** 조선 중기, 임진왜란 발발 직전
- **Character:** 이순신 (Yi Sun-sin), 47세, 삼도수군통제사
- **Story:** 부족한 병력으로 일본 수군 막아야 할 전략 결정
- **Test Focus:** 시대적 묘사, 역사적 인물, 의사결정 과정

#### Scenario HI2-Medium: The Palace Politics
**Difficulty:** Medium
**Setup:**
- **World Setting:** 조선 궁정, 왕비 세자빈 간 세력 다툼
- **Character:** 중전 (Queen), 32세, 왕을 보좌하며 왕비 견제
- **Story:** 왕의 건강이 악화되며 후계자 문제로 정치적 암살 시도
- **Test Focus:** 궁정 정치, 여성의 권력 투쟁, 시대적 사회규범

#### Scenario HI3-Advanced: The Traitor's Redemption
**Difficulty:** Advanced
**Setup:**
- **World Setting:** 고려 말, 몽골 침략기, 배신자의 딸
- **Character:** 다희 (Da-hui), 24세, 몽골에 협력한 아버지의 딸
- **Story:** 아버지의 배신을 씻고 독립운동에 참여, 운명과 선택
- **Test Focus:** 개인의 운명 vs 역사의 흐름, 복잡한 충성심, 비극적 요소

---

### 9. 심리 (Psychological)

#### Scenario P1-Basic: The Imposter Syndrome
**Difficulty:** Basic
**Setup:**
- **World Setting:** 대학원, 첫 학회 발표 준비
- **Character:** 현수 (Hyeon-su), 27세, 박사과정, 자신감 없음
- **Story:** 주변 사람들이 자신을 사기꾼 취급하는 것 같은 착각
- **Test Focus:** 내면 독백, 자의식 과잉, 불안감 묘사

#### Scenario P2-Medium: The Therapy Sessions
**Difficulty:** Medium
**Setup:**
- **World Setting:** 정신과 치료실, 주 1회 상담
- **Character:** 유진 (Yu-jin), 30세, 환자, 기억 상실
- **Story:** 치료를 받을수록 기억이 돌아오지만 기억의 진위를 의심
- **Test Focus:** 기억 vs 환각, 치료사-환자 역학, 신뢰의 붕괴

#### Scenario P3-Advanced: The Shared Delusion
**Difficulty:** Advanced
**Setup:**
- **World Setting:** 폐쇄적인 컬트 집단, 3년간 거주
- **Character:** 성민 (Seong-min), 34세, 전 교수, 탈출 후 현실 적응 실패
- **Story:** 집단에서의 환각이 실제로 일어났는지 확신할 수 없음
- **Test Focus:** 집단 최면, 개성 상실, 현실 왜곡, 심리적 공포

---

## Test Execution Plan

### Phase 1: Story Generation (3 hours)
1. Use production Gemini API via `/api/game/test-prompt` endpoint
2. For each scenario:
   - Build proper prompt with genre configuration
   - Generate opening narrative (~500-1000 tokens)
   - Generate 2-3 player responses (simulate conversation)
   - Record full interaction for evaluation

### Phase 2: Quality Evaluation (4 hours)
1. Each story scored on 6 criteria (1-10 scale)
2. Written feedback for each criterion
3. Identification of specific prompt improvements needed
4. Genre comparison and ranking

### Phase 3: Analysis & Reporting (2 hours)
1. Compile test results into report
2. Create benchmark examples
3. Prioritize improvements (P0/P1/P2)
4. Document recommendations

---

## Next Steps

1. ✅ Review current genre prompts
2. ✅ Design 27 test scenarios
3. ⏳ Execute story generation tests
4. ⏳ Evaluate quality across all dimensions
5. ⏳ Create test report and benchmarks
6. ⏳ Document improvement priorities

---

**Document Status:** ✅ Test scenarios defined
**Next Action:** Execute story generation tests using production API
