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
            model: "llama-3.3-70b-versatile",
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
router.post('/chat', async (req, res) => {
    try {
        const { message, chatHistory } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Check if user is authenticated
        const authHeader = req.headers.authorization;
        let token = authHeader && authHeader.split(' ')[1];
        if (!token) token = req.cookies?.token;
        
        let user = null;
        let isAuthenticated = false;
        
        if (token) {
            try {
                const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'your-secret-key');
                user = await User.findById(decoded.userId);
                isAuthenticated = !!user;
            } catch (err) {
                console.log('Token verification failed:', err.message);
            }
        }
        
        // 2. Process Data for RAG
        const watchedTitles = user?.animeList && user.animeList.length > 0 
            ? user.animeList.map(a => a.title).join(', ') 
            : 'None yet';
            
        const quizzesTaken = user?.quizzesTaken || 0;

        // 3. The Master System Prompt
        const systemPrompt = isAuthenticated ? `
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
3. Keep your responses short (2-3 sentences max) unless providing detailed recommendations.
4. Format your output in strict Markdown (use bolding for anime titles).
5. TOOL USAGE IS MANDATORY: When user asks to add/remove anime, check list, navigate, or update bio, you MUST call the appropriate tool. NEVER write function names or JSON in your response.
6. NEVER EVER write text like 'add_anime_to_list', 'search_anime_info', or any function names in your response. These are internal tools that you must CALL, not write about.
7. When recommending anime, provide 3-5 suggestions with brief descriptions.
8. NAVIGATION: ALWAYS use navigate_to_anime_page tool when users say "redirect to", "go to", "take me to", "show me the page", "navigate to", "open the page", "visit the page" followed by an anime name. NEVER just respond with text - ALWAYS call the tool.
9. BIO SUGGESTIONS AND UPDATES:
   - When user asks "suggest me a cool bio", generate 2-3 creative anime-themed bio suggestions and present them.
   - When user says "add this to my bio: [text]" or "set my bio to: [text]", FIRST show them the bio and ask "Should I save this as your bio?". Wait for confirmation (yes/ok/sure), then use update_user_bio tool.
   - When they confirm with "yes", "ok", "sure", "do it", use the update_user_bio tool with the bio text they provided earlier.
10. IMAGE AND POSTER REQUESTS:
   - When user asks for "image", "poster", "picture", "show me X anime", use search_anime_info tool.
   - After getting the image URL, display it using Markdown image syntax: ![Anime Title](image_url)
   - Always show the image along with basic info like score and synopsis.
11. TOOL EXECUTION: When you need to use a tool, use the proper function calling mechanism. NEVER write out function syntax as text.
` : `
You are "Pochita", a friendly and helpful anime assistant for RankOtaku.
You provide anime recommendations, information, and general anime discussions.

IMPORTANT: The user is NOT logged in. You can:
- Recommend anime based on their preferences
- Provide general anime information and discussions
- Answer questions about anime

You CANNOT:
- Add/remove anime from their list
- Update their profile
- Access their personal data

If they ask for features requiring login, politely tell them to log in first.

CRITICAL RULES:
1. Speak normally, clearly, and concisely.
2. Provide direct, helpful answers.
3. Keep your responses short (2-3 sentences max) unless providing detailed recommendations.
4. Format your output in strict Markdown (use bolding for anime titles).
5. When recommending anime, provide 3-5 suggestions with brief descriptions.
`;

        // 4. Define Agentic Tools (only if authenticated)
        const tools = isAuthenticated ? [
            {
                type: "function",
                function: {
                    name: "add_anime_to_list",
                    description: "Add an anime to the user's watch list. Use when user says 'add X to my list' or 'add X'.",
                    parameters: {
                        type: "object",
                        properties: {
                            anime_name: { type: "string", description: "The anime title only. Example: 'Naruto', 'Death Note', 'One Piece'. Remove words like 'add', 'to', 'my', 'list'." }
                        },
                        required: ["anime_name"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "remove_anime_from_list",
                    description: "Remove an anime from the user's watch list. Use when user says 'remove X' or 'delete X from my list'.",
                    parameters: {
                        type: "object",
                        properties: {
                            anime_name: { type: "string", description: "The anime title only. Example: 'Naruto', 'Death Note'. Remove words like 'remove', 'delete', 'from', 'my', 'list'." }
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
                    description: "Navigate user to an anime page. MUST use this tool when user says 'redirect to', 'go to', 'take me to', 'show me the page', 'navigate to', 'open', 'visit' followed by anime name. DO NOT just respond with text.",
                    parameters: {
                        type: "object",
                        properties: {
                            anime_name: { type: "string", description: "The anime name to navigate to. Extract ONLY the anime title, remove words like 'go to', 'redirect', 'page', etc." }
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
        ] : [
            {
                type: "function",
                function: {
                    name: "search_anime_info",
                    description: "Search for factual info (synopsis, score, image/poster, etc) about an anime from the database.",
                    parameters: {
                        type: "object",
                        properties: {
                            anime_name: { type: "string", description: "The EXACT official name of the anime." }
                        },
                        required: ["anime_name"]
                    }
                }
            }
        ];

        let finalMessages = [
            { role: "system", content: systemPrompt },
            ...(chatHistory || []),
            { role: "user", content: message }
        ];

        // 5. Connect to Groq API with stronger tool enforcement
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: finalMessages,
            tools: tools,
            tool_choice: "auto",
            temperature: 0.5,
            max_tokens: 300,
        });

        let responseMessage = completion.choices[0].message;
        
        // Debug log to see what we're getting
        console.log('Response message:', JSON.stringify(responseMessage, null, 2));

        // Groq Fallback: If model leaked <tool_name>{args}</tool_name> natively in content instead of tool_calls array
        if (!responseMessage.tool_calls && responseMessage.content) {
            // First check <function=name>args</function>
            let regex = /<function=(\w+)>(.*?)<\/function>/is;
            let match = responseMessage.content.match(regex);
            
            // If not found, check generic XML like <navigate_to_anime_page>{"anime_name": "Naruto"}</navigate_to_anime_page>
            if (!match) {
                const xmlRegex = /<([a-zA-Z0-9_]+)>(\{.*?\})<\/\1>/is;
                match = responseMessage.content.match(xmlRegex);
            }

            if (match) {
                console.log("Triggered fallback XML tool parser for:", match[1]);
                responseMessage.tool_calls = [{
                    id: "call_fallback_" + Math.random().toString(36).substring(2, 9),
                    type: "function",
                    function: {
                        name: match[1],
                        arguments: match[2]
                    }
                }];
                responseMessage.content = ""; // Clear string
            }
        }

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
                        if (!isAuthenticated) {
                            resultMessage = "Please log in to add anime to your list.";
                        } else {
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
                    } 
                    else if (toolCall.function.name === 'remove_anime_from_list') {
                        if (!isAuthenticated) {
                            resultMessage = "Please log in to remove anime from your list.";
                        } else {
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
                        if (!isAuthenticated) {
                            resultMessage = "Please log in to update your bio.";
                        } else {
                        user.bio = args.new_bio;
                        await user.save();
                        resultMessage = `Successfully updated the user's profile biography to: "${args.new_bio}"`;
                        didModifyList = true;
                        }
                    }
                    else if (toolCall.function.name === 'get_leaderboard_rank') {
                        if (!isAuthenticated) {
                            resultMessage = "Please log in to check your leaderboard rank.";
                        } else {
                        const User = require('../models/User'); // ensure it's loaded
                        const allUsers = await User.find().sort({ otakuPoints: -1 }).select('_id username otakuPoints');
                        const rankIndex = allUsers.findIndex(u => u._id.toString() === req.user.userId);
                        if (rankIndex !== -1) {
                            resultMessage = `The user is currently Rank #${rankIndex + 1} on the global leaderboard with ${user.otakuPoints} points!`;
                        } else {
                            resultMessage = "Could not find the user on the leaderboard.";
                        }
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
                        if (!isAuthenticated) {
                            resultMessage = "Please log in to check your anime list.";
                        } else {
                        const animeName = (args.anime_name || '').toLowerCase();
                        const found = user.animeList.find(a => a.title.toLowerCase().includes(animeName));
                        if (found) {
                            resultMessage = `Yes, **${found.title}** is in the user's list with status: ${found.status}.`;
                        } else {
                            resultMessage = `No, **${args.anime_name}** is not in the user's list.`;
                        }
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
                max_tokens: 250,
            });

            const finalReply = secondResponse.choices[0]?.message?.content || "I have completed the task.";
            return res.json({ reply: finalReply, listModified: req.listModified || false });
        }

        // If no tool was called, return standard response
        const reply = responseMessage.content || "I have completed the task.";
        
        // Check if the response contains raw function call syntax (error case)
        if (reply.includes('add_anime_to_list') || reply.includes('remove_anime_from_list') || 
            reply.includes('search_anime_info') || reply.includes('navigate_to_anime_page') ||
            reply.includes('<function') || reply.includes('</function>')) {
            
            console.error('AI returned raw function syntax instead of calling tool:', reply);
            
            return res.json({ 
                reply: "I apologize, I'm having trouble processing that request. Please try rephrasing it, for example: 'Add Naruto to my list' or 'Remove Death Note from my list'.",
                listModified: false 
            });
        }
        
        res.json({ reply: reply, listModified: false });
    } catch (error) {
        console.error('Sensei API Error:', error);
        
        // Handle rate limit errors specifically
        if (error.status === 429) {
            return res.status(429).json({ 
                error: 'Rate limit reached',
                reply: 'I\'m currently experiencing high demand. Please try again in a few minutes. 🙏'
            });
        }
        
        res.status(500).json({ 
            error: error.message,
            reply: 'Sorry, I encountered an error. Please try again later.'
        });
    }
});

module.exports = router;
