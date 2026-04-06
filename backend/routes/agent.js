const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const axios = require('axios');
const User = require('../models/User');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.split(' ')[1];
    if (!token) token = req.cookies?.token;
    
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    try {
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// GET route to initialize the Sensei with a DYNAMIC greeting
router.get('/init', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const watchedTitles = user.animeList && user.animeList.length > 0 
            ? user.animeList.map(a => a.title).join(', ') 
            : 'None yet';

        const greetingPrompt = `
You are "Pochita", the user's personal anime assistant. Your user is "${user.username}" and they have ${user.otakuPoints} Otaku Points. They have watched: [${watchedTitles}].

GENERATE A BRIEF, FRIENDLY GREETING.
Act like a helpful, normal companion (do NOT bark or use all caps). 
End the greeting by asking them what you can assist them with today. Keep it under 2 sentences.
`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "system", content: greetingPrompt }],
            temperature: 0.9,
            max_tokens: 150,
        });

        res.json({ message: completion.choices[0].message.content });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST route for actual chat
router.post('/chat', authenticateToken, async (req, res) => {
    try {
        const { message, chatHistory } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // 1. Fetch user context from MongoDB
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // 2. Process Data for RAG
        const watchedTitles = user.animeList && user.animeList.length > 0 
            ? user.animeList.map(a => a.title).join(', ') 
            : 'None yet';
            
        // We calculate recent quiz performance if the schema supports it.
        // Assuming user schema has quizzesTaken or similar stats
        const quizzesTaken = user.quizzesTaken || 0;

        // 3. The Master System Prompt
        const systemPrompt = `
You are "Pochita", a highly competent and helpful anime assistant for RankOtaku. 
You act friendly, respectful, and serious about helping the user manage their anime list and finding accurate information.

--- USER CONTEXT DIRECTORY ---
- Name: ${user.username}
- Current Rank Points: ${user.otakuPoints}
- Completed Anime List: [${watchedTitles}]
------------------------------

CRITICAL RULES:
1. Speak normally, clearly, and concisely. DO NOT bark, do NOT use "Woof!", and do NOT use excessive ALL CAPS or exclamation points.
2. Provide direct, helpful answers.
3. Keep your responses short (2-3 sentences max) unless providing a synopsis.
4. Format your output in strict Markdown (use bolding for anime titles).
5. Be intelligent about tool usage: isolate the exact anime title from the user's text.
6. NEVER output raw function syntax like <function/tool_name> or </function>. ONLY use the proper tool calling mechanism provided by the system. If you need to use a tool, call it properly through the tools interface.
7. NAVIGATION INTENT: ONLY use navigate_to_anime_page when users EXPLICITLY say "redirect to", "go to", "take me to", "show me the page", "navigate to", "open the page", "visit the page" followed by an anime name. DO NOT use navigation for questions like "is X in my list", "do I have X", "tell me about X". Navigation is ONLY for explicit redirect requests.
7. BIO SUGGESTIONS AND UPDATES:
   - When user asks "suggest me a cool bio", generate 2-3 creative anime-themed bio suggestions and present them.
   - When user says "add this to my bio: [text]" or "set my bio to: [text]", FIRST show them the bio and ask "Should I save this as your bio?". Wait for confirmation (yes/ok/sure), then use update_user_bio tool.
   - When they confirm with "yes", "ok", "sure", "do it", use the update_user_bio tool with the bio text they provided earlier.
8. IMAGE AND POSTER REQUESTS:
   - When user asks for "image", "poster", "picture", "show me X anime", use search_anime_info tool.
   - After getting the image URL, display it using Markdown image syntax: ![Anime Title](image_url)
   - Always show the image along with basic info like score and synopsis.
9. TOOL EXECUTION: When you need to use a tool, use the proper function calling mechanism. NEVER write out function syntax as text.
`;

        // 4. Define Agentic Tools
        const tools = [
            {
                type: "function",
                function: {
                    name: "add_anime_to_list",
                    description: "Add an anime to the user's watch list.",
                    parameters: {
                        type: "object",
                        properties: {
                            anime_name: { type: "string", description: "The EXACT official name of the anime. Remove conversational words like 'add', 'wrong', 'the', etc." }
                        },
                        required: ["anime_name"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "remove_anime_from_list",
                    description: "Remove or delete an anime from the user's watch list.",
                    parameters: {
                        type: "object",
                        properties: {
                            anime_name: { type: "string", description: "The EXACT anime title to search for in their list to delete. Remove conversational adjectives." }
                        },
                        required: ["anime_name"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "search_anime_info",
                    description: "Search for factual info (synopsis, score, image/poster, etc) about an anime from the database. Use this when user asks for anime info, poster, image, or details.",
                    parameters: {
                        type: "object",
                        properties: {
                            anime_name: { type: "string", description: "The EXACT official name of the anime. Do not include conversational words." }
                        },
                        required: ["anime_name"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "update_user_bio",
                    description: "Update or write a new profile biography for the user if they ask you to.",
                    parameters: {
                        type: "object",
                        properties: {
                            new_bio: { type: "string", description: "The new bio to set for the user." }
                        },
                        required: ["new_bio"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "check_anime_in_list",
                    description: "Check if a specific anime is in the user's watch list. Use when user asks 'is X in my list', 'do I have X', 'have I added X'.",
                    parameters: {
                        type: "object",
                        properties: {
                            anime_name: { type: "string", description: "The anime title to check in the user's list." }
                        },
                        required: ["anime_name"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "navigate_to_anime_page",
                    description: "ONLY use when user EXPLICITLY requests navigation with phrases: 'redirect to', 'go to', 'take me to', 'show me the page', 'navigate to', 'open the page', 'visit the page'. DO NOT use for questions like 'is X in my list' or 'tell me about X'.",
                    parameters: {
                        type: "object",
                        properties: {
                            anime_name: { type: "string", description: "The EXACT official name of the anime to navigate to. Remove conversational words like 'go to', 'show me', 'redirect', 'page', 'that', etc." }
                        },
                        required: ["anime_name"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "get_leaderboard_rank",
                    description: "Check the user's current rank and position on the global RankOtaku leaderboard.",
                    parameters: {
                        type: "object",
                        properties: {}
                    }
                }
            }
        ];

        let finalMessages = [
            { role: "system", content: systemPrompt },
            ...(chatHistory || []),
            { role: "user", content: message }
        ];

        // 5. Connect to Groq API
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: finalMessages,
            tools: tools,
            tool_choice: "auto",
            temperature: 0.7,
            max_tokens: 500,
        });

        const responseMessage = completion.choices[0].message;
        
        // Debug log to see what we're getting
        console.log('Response message:', JSON.stringify(responseMessage, null, 2));

        // 6. Handle Tool Calls
        if (responseMessage.tool_calls) {
            finalMessages.push(responseMessage); // Append the assistant's tool call

            for (const toolCall of responseMessage.tool_calls) {
                let args = {};
                try {
                    args = JSON.parse(toolCall.function.arguments || '{}');
                } catch (e) {
                    console.error("Agent Tool Parsing Error:", e);
                }
                
                let resultMessage = "";
                let didModifyList = false;

                try {
                    if (toolCall.function.name === 'add_anime_to_list') {
                        const jikanRes = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(args.anime_name || '')}&limit=1`);
                        const animeData = jikanRes.data.data[0];
                        if (animeData) {
                            if (user.animeList.some(a => a.animeId === animeData.mal_id)) {
                                resultMessage = `The anime '${animeData.title}' is already in their list.`;
                            } else {
                                user.animeList.push({
                                    animeId: animeData.mal_id,
                                    title: animeData.title,
                                    image: animeData.images.webp.large_image_url || animeData.images.jpg.large_image_url,
                                    status: 'Watching'
                                });
                                await user.save();
                                resultMessage = `Successfully added '${animeData.title}'!`;
                                didModifyList = true;
                            }
                        } else {
                            resultMessage = `Could not find anime matching '${args.anime_name}'.`;
                        }
                    } 
                    else if (toolCall.function.name === 'remove_anime_from_list') {
                        const initLen = user.animeList.length;
                        user.animeList = user.animeList.filter(a => !a.title.toLowerCase().includes((args.anime_name || '').toLowerCase()));
                        if (user.animeList.length < initLen) {
                            await user.save();
                            resultMessage = `Successfully removed '${args.anime_name}' from the list!`;
                            didModifyList = true;
                        } else {
                            resultMessage = `I couldn't find '${args.anime_name}' in your list to remove.`;
                        }
                    }
                    else if (toolCall.function.name === 'search_anime_info') {
                        const jikanRes = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(args.anime_name || '')}&limit=1`);
                        const animeData = jikanRes.data.data[0];
                        if (animeData) {
                            const imgUrl = animeData.images.webp.large_image_url || animeData.images.jpg.large_image_url;
                            resultMessage = `Here is the database info for ${animeData.title}:\nImage URL: ${imgUrl}\nScore: ${animeData.score}/10\nEpisodes: ${animeData.episodes}\nSynopsis: ${animeData.synopsis.substring(0, 300)}...`;
                        } else {
                            resultMessage = `Could not find any info for '${args.anime_name}'.`;
                        }
                    }
                    else if (toolCall.function.name === 'update_user_bio') {
                        user.bio = args.new_bio;
                        await user.save();
                        resultMessage = `Successfully updated the user's profile biography to: "${args.new_bio}"`;
                        didModifyList = true; // reusing this flag to trigger frontend refresh!
                    }
                    else if (toolCall.function.name === 'get_leaderboard_rank') {
                        const User = require('../models/User'); // ensure it's loaded
                        const allUsers = await User.find().sort({ otakuPoints: -1 }).select('_id username otakuPoints');
                        const rankIndex = allUsers.findIndex(u => u._id.toString() === req.user.userId);
                        if (rankIndex !== -1) {
                            resultMessage = `The user is currently Rank #${rankIndex + 1} on the global leaderboard with ${user.otakuPoints} points!`;
                        } else {
                            resultMessage = "Could not find the user on the leaderboard.";
                        }
                    }
                    else if (toolCall.function.name === 'navigate_to_anime_page') {
                        const jikanRes = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(args.anime_name || '')}&limit=1`);
                        const animeData = jikanRes.data.data[0];
                        if (animeData) {
                            const slug = animeData.title
                                .toLowerCase()
                                .replace(/[^a-z0-9\s-]/g, '')
                                .replace(/\s+/g, '-')
                                + '-' + animeData.mal_id;
                            // Return ONLY the navigation command, nothing else
                            resultMessage = `NAVIGATE:/anime/${slug}|${animeData.title}`;
                            // Set a flag to return navigation immediately
                            req.shouldNavigate = { url: `/anime/${slug}`, title: animeData.title };
                        } else {
                            resultMessage = `Could not find anime matching '${args.anime_name}' to navigate to.`;
                        }
                    }
                    else if (toolCall.function.name === 'check_anime_in_list') {
                        const animeName = (args.anime_name || '').toLowerCase();
                        const found = user.animeList.find(a => a.title.toLowerCase().includes(animeName));
                        if (found) {
                            resultMessage = `Yes, **${found.title}** is in the user's list with status: ${found.status}.`;
                        } else {
                            resultMessage = `No, **${args.anime_name}** is not in the user's list.`;
                        }
                    }
                } catch (e) {
                    console.error('Agent Tool Process Error:', e.message);
                    resultMessage = "There was an internal server error. Jikan API might be rate limiting us. Tell the user exactly this so they know.";
                }

                finalMessages.push({
                    tool_call_id: toolCall.id,
                    role: "tool",
                    name: toolCall.function.name,
                    content: resultMessage,
                });

                if (didModifyList) {
                    req.listModified = true;
                }
                
                // If navigation was triggered, return immediately
                if (req.shouldNavigate) {
                    return res.json({ 
                        reply: `Redirecting you to **${req.shouldNavigate.title}** page... 🎬`,
                        navigate: req.shouldNavigate.url,
                        listModified: false 
                    });
                }
            }

            // Call Groq AGAIN so Pochita can formulate a natural response based on the tool result
            const secondResponse = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: finalMessages,
                temperature: 0.7,
                max_tokens: 400,
            });

            const finalReply = secondResponse.choices[0]?.message?.content || "I have completed the task.";
            return res.json({ reply: finalReply, listModified: req.listModified || false });
        }

        // If no tool was called, return standard response
        const reply = responseMessage.content || "I have completed the task.";
        
        // Check if the response contains raw function call syntax (error case)
        if (reply.includes('<function/') || reply.includes('</function>')) {
            return res.json({ 
                reply: "I apologize, but I encountered an error processing your request. Could you please rephrase what you'd like me to do?",
                listModified: false 
            });
        }
        
        res.json({ reply: reply, listModified: false });
    } catch (error) {
        console.error('Sensei API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
