require('dotenv').config(); // loads .env file and makes everything inside it availabel via process.env
const express = require('express'); //importing packages
const cors = require('cors'); //importing packages

const app = express(); //Creates the actual express application. express() returns app object with all methods like defining routes, starting server, etc.

app.use(cors()); //Middleware, this tells express to allow requests from different origins
app.use(express.json()); //tells express to automatically parse incoming request bodies as JSON. Wihtout this, when frontedn sends data, express wouldnt know how to read it.

app.post('/summarize', async (req, res) => { //defines a POST route at /summarize. whne frontend does fetch then this runs.. req: incoming reques contains everything frontend sent. res is the response. backend -> frontend. asyncL api calls take time u need async/await
  const { commits } = req.body;

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Here are git commit messages from a project. Write a clear, well structured paragraph in plain English explaining what this project does, how it evolved over time, and what was recently worked on:\n\n${commits.join('\n')}`
        }]
      }]
    })
  });


  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
  const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!summary) {
  console.log('Full Gemini response:', JSON.stringify(data, null, 2));
  return res.status(500).json({ error: 'Could not parse Gemini response' });
}

res.json({summary});

});

app.listen(process.env.PORT || 3000, () => {
    console.log('server running on port 3000');
});