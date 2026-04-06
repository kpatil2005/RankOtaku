const express = require("express");
const Groq = require("groq-sdk");
const Quiz = require('../models/Quiz');

const router = express.Router();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

router.post("/generate-quiz", async (req, res) => {
  try {
    const { animeTitle } = req.body;

    if (!animeTitle) {
      return res.status(400).json({ error: "Anime title is required" });
    }

    // Check MongoDB cache first
    const cachedQuiz = await Quiz.findOne({ animeTitle });
    if (cachedQuiz) {
      console.log('Returning cached quiz from MongoDB');
      return res.json({
        quizId: cachedQuiz._id,
        quiz: cachedQuiz.questions
      });
    }

    // Generate new quiz
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are a quiz generator. Always respond with valid JSON only, no explanations."
        },
        {
          role: "user",
          content: `Generate 15 multiple choice quiz questions about the anime "${animeTitle}" in this exact order:

First 5 questions - EASY difficulty (basic plot, main characters, obvious facts)
Next 5 questions - INTERMEDIATE difficulty (character relationships, key events, story arcs)
Last 5 questions - HARD difficulty (specific details, minor characters, episode-specific content, deep lore)

Return ONLY a JSON array in this exact format: [{"question": "text", "difficulty": "easy", "options": ["option1", "option2", "option3", "option4"], "answer": "correct option"}]

Make sure the first 5 have "difficulty": "easy", next 5 have "difficulty": "intermediate", and last 5 have "difficulty": "hard".`
        }
      ],
      temperature: 0.7
    });

    let text = completion.choices[0].message.content;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const quiz = JSON.parse(text);

    // Save to MongoDB for future use
    const savedQuiz = await Quiz.create({
      animeTitle,
      questions: quiz
    });

    res.json({
      quizId: savedQuiz._id,
      quiz: savedQuiz.questions
    });

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});



// Generate character-specific quiz
router.post("/generate-character-quiz", async (req, res) => {
  try {
    const { characterName, animeTitle } = req.body;
    if (!characterName || !animeTitle) {
      return res.status(400).json({ error: "Character name and anime title are required" });
    }
    // 1️⃣ Check MongoDB cache first
    const cachedQuiz = await Quiz.findOne({ characterName, animeTitle, quizType: 'character' });
    if (cachedQuiz) {
        console.log('✅ Returning cached character quiz from MongoDB');
        return res.json({ quiz: cachedQuiz.questions });
    }

    // 2️⃣ Cache miss — generate from Groq API
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "You are a quiz generator. Always respond with valid JSON only, no explanations."
        },
        {
          role: "user",
          content: `Generate 5 diverse multiple choice quiz questions about the character "${characterName}" from the anime "${animeTitle}". 

Make each question about a DIFFERENT aspect of the character:
1. One question about their appearance or physical traits
2. One question about their personality or behavior
3. One question about their abilities, powers, or skills
4. One question about their relationships with other characters
5. One question about their role in the story or a key moment

Make the questions varied and interesting. Avoid repetitive question types.

Return ONLY a JSON array in this exact format: [{"question": "text", "options": ["option1", "option2", "option3", "option4"], "answer": "correct option"}]`
        }
      ],
      temperature: 0.9
    });

    let text = completion.choices[0].message.content;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const quiz = JSON.parse(text);

    // 3️⃣ Save to MongoDB for next time (auto-expires in 24h)
    await Quiz.create({
        animeTitle,
        characterName,
        quizType: 'character',
        questions: quiz
    });

    res.json({ quiz: quiz });

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;
