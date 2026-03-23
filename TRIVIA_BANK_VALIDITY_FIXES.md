# Trivia bank validity fixes

This file records the exact question-answer combinations in `bank.json` that should be changed to make the bank a stricter single-answer MCQ set.

## Clearly invalid or ambiguous items

### 1) Geography — South Africa capital
**Current**
- Question: `What is the capital of South Africa?`
- Marked answer: `Pretoria`

**Problem**
South Africa has multiple capitals, so the current wording is ambiguous.

**Replace with**
- Question: `Which city is the administrative capital of South Africa?`
- Keep correct answer: `Pretoria`
- Explanation: `Pretoria is South Africa's administrative capital.`

---

### 2) Geography — Nuuk / Greenland
**Current**
- Question: `Which country contains the city of Nuuk?`
- Marked answer: `Greenland`

**Problem**
Greenland is not a sovereign country, so the wording is invalid.

**Replace with**
- Question: `Nuuk is the capital of which autonomous territory?`
- Keep correct answer: `Greenland`
- Explanation: `Nuuk is the capital of Greenland, an autonomous territory within the Kingdom of Denmark.`

---

### 3) India — Chandigarh shared capital
**Current**
- Question: `Which Indian state uses Chandigarh as a shared capital?`
- Options include both `Punjab` and `Haryana`
- Marked answer: `Punjab`

**Problem**
Two options are correct.

**Replace with**
- Question: `Which Indian state shares Chandigarh as its capital with Haryana?`
- Keep correct answer: `Punjab`
- Explanation: `Chandigarh serves as the capital of Punjab and Haryana.`

---

### 4) India — Jammu and Kashmir capital
**Current**
- Question: `What is the capital of the union territory of Jammu and Kashmir?`
- Marked answer: `Srinagar`

**Problem**
This is not a stable single-answer question unless the seasonal context is specified.

**Replace with**
- Question: `What is the summer capital of the union territory of Jammu and Kashmir?`
- Keep correct answer: `Srinagar`
- Explanation: `Srinagar serves as the summer capital of Jammu and Kashmir.`

---

### 5) India — Andhra Pradesh capital
**Current**
- Question: `What is the capital of Andhra Pradesh?`
- Marked answer: `Amaravati`

**Problem**
This is politically/time-sensitive and should be framed more carefully.

**Replace with**
- Question: `Which city is the planned capital of Andhra Pradesh?`
- Keep correct answer: `Amaravati`
- Explanation: `Amaravati is the planned capital city of Andhra Pradesh.`

---

### 6) India — Amaravati association
**Current**
- Question: `Which Indian state is associated with the city of Amaravati?`
- Marked answer: `Andhra Pradesh`

**Problem**
Also time-sensitive unless clarified.

**Replace with**
- Question: `Which Indian state is associated with the planned capital city of Amaravati?`
- Keep correct answer: `Andhra Pradesh`
- Explanation: `Amaravati is associated with Andhra Pradesh as its planned capital city.`

---

### 7) Tolkien — Grey Havens / Mithlond duplicate
**Current**
- Question: `What is the name of the haven from which Elves sail west?`
- Options include both `Grey Havens` and `Mithlond`
- Marked answer: `Grey Havens`

**Problem**
Two options refer to the same place.

**Replace with**
- Question: `What is the common English name of Mithlond?`
- Keep correct answer: `Grey Havens`
- Explanation: `Mithlond is commonly called the Grey Havens.`

---

### 8) Tolkien — Lake-town / Esgaroth duplicate
**Current**
- Question: `What town lies on Long Lake near Erebor?`
- Options include both `Lake-town` and `Esgaroth`
- Marked answer: `Lake-town`

**Problem**
Two options refer to the same place.

**Replace with**
- Question: `What is the common name of Esgaroth?`
- Keep correct answer: `Lake-town`
- Explanation: `Esgaroth is commonly called Lake-town.`

---

## Strongly recommended wording cleanups

### 9) Tolkien — Thorin / later rules Erebor
**Current**
- Question: `Who is Bilbo’s dwarf friend that later rules Erebor?`
- Marked answer: `Thorin Oakenshield`

**Problem**
The wording invites `Dáin Ironfoot` as the stronger answer.

**Replace with**
- Question: `Who is Bilbo’s dwarf friend who leads the Quest of Erebor?`
- Keep correct answer: `Thorin Oakenshield`
- Explanation: `Thorin Oakenshield leads the Quest of Erebor in The Hobbit.`

---

### 10) History — Haitian Revolution
**Current**
- Question: `Who led the Haitian Revolution and became a key leader of Haiti?`
- Marked answer: `Toussaint Louverture`

**Problem**
The wording is a bit loose and can invite dispute.

**Replace with**
- Question: `Who was the most famous early leader of the Haitian Revolution?`
- Keep correct answer: `Toussaint Louverture`
- Explanation: `Toussaint Louverture was the most famous early leader of the Haitian Revolution.`

---

## Additional note on `wortschatz`

The `wortschatz` category has many items that are usable but not ideal for strict single-answer trivia because several German words have multiple valid English glosses.

Examples:
- `die Nachricht` -> `message` / `news`
- `komisch` -> `strange` / `funny`
- `tatsächlich` -> `actual` / `actually` / `indeed`
- `der Umgang` -> `interaction` / `handling` / `dealing with`

If strict quiz validity matters, this category should be rewritten to either:
1. use sentence context, or
2. accept synonymous answers, or
3. switch to narrower vocabulary prompts.
