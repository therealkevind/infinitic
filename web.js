import express from "express";

const app = express();

app.use(express.static("public"));

app.set("views", "./views");
app.set("view engine", "ejs");
app.get("/", (req, res) => {
  res.render("index", {
    inviteUrl: `https://discord.com/api/oauth2/authorize?client_id=${process.env.clientId}&permissions=2147516416&scope=bot%20applications.commands`
  });
});

const listener = app.listen(process.env.PORT, () => {
  console.log(`Listening on port ${listener.address().port}`);
});

export { app as default };
