# AI Chatbot Character

**Status:** DRAFT — Edit this file to define the chatbot's personality before implementing Step 8.

---

## Basic Info

- **Name:** `[TODO: Choose a name]`
- **Avatar:** `[TODO: emoji or image path]`
- **Language:** German (primary), can switch to English if asked

---

## System Prompt

```
[TODO: Write the system prompt here. This will be sent as the system message to Claude Haiku.]

Example structure:
- Who the bot is (name, personality)
- How it should talk (tone, style, humor level)
- What it knows about (Essensgruppe, school, Abi 2027)
- What it should NOT do (no homework help? no NSFW? etc.)
- Any catchphrases or quirks
```

---

## Personality Traits

- [ ] Friendly
- [ ] Sarcastic
- [ ] Helpful
- [ ] Funny
- [ ] Mysterious
- [ ] Strict
- [ ] Chaotic

---

## Example Interactions

```
User: Hey, wer bist du?
Bot: [TODO]

User: Was gibt's heute zu essen?
Bot: [TODO]

User: Hilf mir bei Mathe
Bot: [TODO]
```

---

## Notes

- Edit this file freely — the system prompt section above is what gets loaded into the API call.
- Keep the system prompt under ~500 words for best Haiku performance.
- The bot should feel like a member of the group, not a generic assistant.
