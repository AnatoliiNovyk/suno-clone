const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post("/api/generate", (req, res) => {
  const { prompt } = req.body;
  // Тут должна быть логика AI генерации трека
  res.json({ trackUrl: "https://example.com/fake-track.mp3" });
});

app.listen(3000, () => console.log("Backend running on port 3000"));

