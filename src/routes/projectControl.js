const express = require("express");
const projects = require("../db/queries/projects");
const systemdControl = require("../services/systemdControl");
const envFileEditor = require("../services/envFileEditor");
const manageableUnits = require("../config/manageable-units");
const { recordAdminAction } = require("../services/auditLog");
const { verifyCsrf } = require("../middleware/csrf");

const router = express.Router();

const UNIT_SECONDS = { s: 1, min: 60, h: 3600 };

function redirectWithResult(res, slug, promise, okTag, detail) {
  promise
    .then(() => {
      recordAdminAction(okTag, slug, detail);
      res.redirect(`/projects/${slug}?ok=${okTag}`);
    })
    .catch((e) => {
      res.redirect(`/projects/${slug}?error=${encodeURIComponent(e.message)}`);
    });
}

router.post("/projects/:slug/interval", verifyCsrf, (req, res) => {
  const { slug } = req.params;
  const amount = parseFloat(req.body.amount);
  const unit = req.body.unit;

  if (!Number.isFinite(amount) || !UNIT_SECONDS[unit]) {
    return res.redirect(`/projects/${slug}?error=${encodeURIComponent("Interval qiymati yoki birligi noto'g'ri")}`);
  }
  const totalSeconds = Math.round(amount * UNIT_SECONDS[unit]);
  redirectWithResult(
    res,
    slug,
    systemdControl.setTimerInterval(slug, totalSeconds),
    "interval_change",
    `${amount} ${unit} (${totalSeconds}s)`
  );
});

router.post("/projects/:slug/telegram", verifyCsrf, (req, res) => {
  const { slug } = req.params;
  const unit = manageableUnits[slug];
  if (!unit || !unit.envPath || !unit.telegramEnvKeys) {
    return res.redirect(`/projects/${slug}?error=${encodeURIComponent("Bu loyiha uchun Telegram sozlamalari mavjud emas")}`);
  }

  const { botToken, chatId, topicId } = req.body;
  const updates = {};
  if (botToken) updates[unit.telegramEnvKeys.botToken] = botToken.trim();
  if (chatId) updates[unit.telegramEnvKeys.chatId] = chatId.trim();
  if (topicId) updates[unit.telegramEnvKeys.topicId] = topicId.trim();

  if (Object.keys(updates).length === 0) {
    return res.redirect(`/projects/${slug}?error=${encodeURIComponent("Hech qanday qiymat kiritilmadi")}`);
  }

  redirectWithResult(
    res,
    slug,
    Promise.resolve().then(() => envFileEditor.updateEnvValues(unit.envPath, updates)),
    "telegram_update",
    "bot/chat/topic yangilandi"
  );
});

router.post("/projects/:slug/rename", verifyCsrf, (req, res) => {
  const { slug } = req.params;
  const displayName = (req.body.displayName || "").trim();
  if (!displayName) {
    return res.redirect(`/projects/${slug}?error=${encodeURIComponent("Nom bo'sh bo'lishi mumkin emas")}`);
  }

  redirectWithResult(
    res,
    slug,
    Promise.resolve().then(() => projects.updateDisplayName(slug, displayName)),
    "rename",
    displayName
  );
});

router.post("/projects/:slug/pause", verifyCsrf, (req, res) => {
  const { slug } = req.params;
  redirectWithResult(
    res,
    slug,
    systemdControl.pauseTimer(slug).then(() => projects.setPaused(slug, true)),
    "pause",
    null
  );
});

router.post("/projects/:slug/resume", verifyCsrf, (req, res) => {
  const { slug } = req.params;
  redirectWithResult(
    res,
    slug,
    systemdControl.resumeTimer(slug).then(() => projects.setPaused(slug, false)),
    "resume",
    null
  );
});

router.post("/projects/:slug/run-now", verifyCsrf, (req, res) => {
  const { slug } = req.params;
  redirectWithResult(res, slug, systemdControl.runNow(slug), "run_now", null);
});

router.get("/projects/:slug/status.json", async (req, res) => {
  try {
    const status = await systemdControl.getStatus(req.params.slug);
    res.json(status);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
