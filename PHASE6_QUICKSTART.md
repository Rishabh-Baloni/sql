# Phase 6: AI Question Generation - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Node.js installed
- Google Gemini API key set in `.env.local`
  ```
  GEMINI_API_KEY=your_api_key_here
  ```

### Installation
```bash
npm install
```

### Build
```bash
npm run build
```

### Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000`

---

## 🎯 Phase 6 Features

### 1. **Practice Mode - Adaptive Questions**

**How it works:**
- Questions are selected using a **40/40/20 policy**:
  - 40% target your **weak skills**
  - 40% explore **random/unexplored** skills
  - 20% reinforce **strong skills** (retention)

- Questions come from a **hybrid source** (50% bank, 50% AI-generated)

**API Endpoint:**
```
GET /api/practice/question
```

**Response:**
```json
{
  "title": "Filtering - Easy",
  "description": "Find all employees in the Sales department",
  "referenceQuery": "SELECT * FROM employee WHERE department = 'Sales'",
  "source": "ai",
  "skill": "Filtering",
  "difficulty": "Easy"
}
```

**Frontend Integration:**
```javascript
const response = await fetch('/api/practice/question');
const question = await response.json();
```

---

### 2. **Interview Mode - Fair Assessment**

**How it works:**
- Generates exactly **3 questions**:
  - 1 per skill (Filtering, Aggregation, Joins)
  - 1 Easy, 1 Medium, 1 Hard
  - **Randomized order**
  - **Ignores your learning profile** (fair and unbiased)

- Uses **hybrid source** (50% bank, 50% AI)

**API Endpoint:**
```
POST /api/interview/start
```

**Response:**
```json
{
  "questions": [
    {
      "id": 1,
      "title": "Joins - Hard",
      "description": "Find employees whose salary is higher than their manager",
      "skill": "Joins",
      "difficulty": "Hard",
      "source": "bank"
    },
    {
      "id": 2,
      "title": "Filtering - Easy",
      "description": "List all employees earning more than 60000",
      "skill": "Filtering",
      "difficulty": "Easy",
      "source": "ai"
    },
    {
      "id": 3,
      "title": "Aggregation - Medium",
      "description": "Calculate average salary per department",
      "skill": "Aggregation",
      "difficulty": "Medium",
      "source": "bank"
    }
  ]
}
```

**Frontend Integration:**
```javascript
const response = await fetch('/api/interview/start', { method: 'POST' });
const { questions } = await response.json();
```

---

### 3. **Submitting Answers**

**For Practice/Learning Mode:**
```
POST /api/learning/submit
```

**Body:**
```json
{
  "query": "SELECT * FROM employee WHERE salary > 60000",
  "questionId": 1,
  "referenceQuery": "SELECT * FROM employee WHERE salary > 60000"
}
```

**For Interview Mode:**
```
POST /api/interview/submit
```

**Body:**
```json
{
  "query": "SELECT * FROM employee WHERE salary > 60000",
  "questionId": 1,
  "referenceQuery": "SELECT * FROM employee WHERE salary > 60000"
}
```

**Response:**
```json
{
  "isCorrect": true,
  "message": "Correct!",
  "userRows": [...],
  "userColumns": [...]
}
```

---

## 🧪 Testing Phase 6

### Manual Testing

1. **Test Practice Mode Adaptive Selection:**
   ```bash
   # Start dev server
   npm run dev
   
   # Open browser at localhost:3000
   # Switch to Practice Mode
   # Answer several questions
   # Observe that weak skills appear more frequently
   ```

2. **Test Interview Mode Fairness:**
   ```bash
   # Start Interview Mode
   # Verify you get exactly 3 questions
   # Check: 1 per skill (Filtering, Aggregation, Joins)
   # Check: 1 Easy, 1 Medium, 1 Hard
   # Order should be random
   ```

3. **Test AI Question Generation:**
   ```bash
   # Check console logs for AI generation
   # Verify questions are validated before use
   # Check generated_questions.db for stored questions
   ```

### Automated Testing (Optional)
```bash
node test-phase6.js
```

---

## 📊 Question Database

Phase 6 creates a new SQLite database: `generated_questions.db`

**Schema:**
```sql
CREATE TABLE generated_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  problem TEXT NOT NULL,
  schema TEXT NOT NULL,
  reference_query TEXT NOT NULL,
  expected_columns TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**View stored questions:**
```bash
sqlite3 generated_questions.db "SELECT * FROM generated_questions;"
```

---

## 🔒 Safety Features

### AI is Controlled
- ✅ AI generates questions
- ❌ AI does NOT evaluate correctness
- ✅ All evaluation uses deterministic SQL engine
- ✅ All AI questions are validated before use

### Validation Pipeline
Every AI-generated question must pass:
1. **Execute reference query** without errors
2. **Return non-empty results**
3. **Match expected column names** exactly

If validation fails → **Fallback to question bank**

### Fairness Guarantees
- Interview mode **ignores learning profile**
- Skill distribution is **deterministic** (1 per skill)
- Difficulty is **balanced** (1 Easy, 1 Medium, 1 Hard)
- Order is **randomized** (unpredictable)

---

## 🛠️ Troubleshooting

### "AI generation failed"
**Cause:** Gemini API key missing or invalid

**Solution:**
```bash
# Check .env.local file exists
cat .env.local

# Should contain:
GEMINI_API_KEY=your_actual_key
```

### "Validation failed"
**Cause:** AI-generated query doesn't match expected format

**Solution:** System automatically falls back to question bank

### "Build errors"
**Cause:** TypeScript compilation issues

**Solution:**
```bash
# Clean build
rm -rf .next
npm run build
```

---

## 📈 Monitoring

### Check AI Usage
```bash
# View console logs for AI generation
npm run dev

# Look for:
# "AI question generation..."
# "Validation passed/failed"
# "Fallback to bank question"
```

### Check Database Growth
```bash
sqlite3 generated_questions.db "SELECT COUNT(*) FROM generated_questions;"
```

### Check Usage Distribution
```bash
sqlite3 generated_questions.db "
  SELECT skill, difficulty, COUNT(*) as count, AVG(usage_count) as avg_usage
  FROM generated_questions
  GROUP BY skill, difficulty;
"
```

---

## 🎓 Usage Examples

### Example 1: Get an Adaptive Practice Question
```javascript
const question = await fetch('/api/practice/question').then(r => r.json());
console.log(question);
// Automatically selects skill based on your weaknesses
```

### Example 2: Start a Fair Interview
```javascript
const interview = await fetch('/api/interview/start', {
  method: 'POST'
}).then(r => r.json());

console.log(interview.questions);
// Always 3 questions: 1 per skill, balanced difficulty
```

### Example 3: Submit and Get Feedback
```javascript
const result = await fetch('/api/learning/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'SELECT * FROM employee WHERE salary > 60000',
    questionId: question.id,
    referenceQuery: question.referenceQuery
  })
}).then(r => r.json());

console.log(result.isCorrect); // true or false
console.log(result.message);   // Feedback
```

---

## 📝 API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/practice/question` | GET | Get adaptive practice question |
| `/api/interview/start` | POST | Generate interview set |
| `/api/interview/submit` | POST | Submit interview answer |
| `/api/learning/submit` | POST | Submit practice answer with learning |
| `/api/learning/profile` | GET | Get learning profile |

---

## ✅ Phase 6 Checklist

- ✅ AI question generation working
- ✅ Question validation pipeline active
- ✅ Hybrid source (50% bank, 50% AI)
- ✅ Practice mode adaptive (40/40/20 policy)
- ✅ Interview mode fair (1 per skill, balanced)
- ✅ Database storing validated questions
- ✅ Fallback to bank on AI failure
- ✅ No breaking changes to previous phases
- ✅ Build successful
- ✅ All existing features preserved

---

**Phase 6 is ready to use! 🎉**

Start the dev server and enjoy unlimited, validated SQL questions!
