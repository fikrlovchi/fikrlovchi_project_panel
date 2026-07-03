require("dotenv").config();
require("./db"); // applies migrations on boot

const path = require("path");
const express = require("express");
const session = require("express-session");

const { requireAuth } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const projectDetailRoutes = require("./routes/projectDetail");
const projectControlRoutes = require("./routes/projectControl");
const accountRoutes = require("./routes/account");
const variablesRoutes = require("./routes/variables");
const ingestRoutes = require("./routes/ingest");
const { startPruningJob } = require("./services/pruning");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "..", "public")));

app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.get("/health", (req, res) => res.json({ ok: true }));

// Ingest API authenticates projects via their own API key, not the admin session.
app.use("/api/ingest", ingestRoutes);

app.use(authRoutes);
app.use(requireAuth, dashboardRoutes);
app.use(requireAuth, projectDetailRoutes);
app.use(requireAuth, projectControlRoutes);
app.use(requireAuth, accountRoutes);
app.use(requireAuth, variablesRoutes);

startPruningJob();

const port = process.env.PORT || 3000;
app.listen(port, "127.0.0.1", () => {
  console.log(`fikrlovchi-panel ${port}-portda ishga tushdi`);
});
