import express from "express";

const app = express();

app.use(express.static("public"));


const listener = app.listen(process.env.PORT, () => {
  console.log(`Listening on port ${listener.address().port}`)
});

export { app as default };
