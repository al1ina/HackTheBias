import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";  // Add this

const app = express();
app.use(cors());
app.use(express.json());

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  console.log("Received:", username, password); // Check if data arrives

  const user = { username, password };

  // Read existing data (or start empty)
  let users = [];
  const filePath = path.join(process.cwd(), "logindata.json"); // Get full path
  
  console.log("File path:", filePath); // See where it's trying to save
  
  if (fs.existsSync(filePath)) {
    users = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  users.push(user);

  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
  
  console.log("Saved successfully!"); // Confirm it saved

  res.json({ message: "Saved (demo only)" });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
  console.log("Current directory:", process.cwd()); // See your working directory
});