const express = require("express");
const projects = require("../db/queries/projects");
const systemdControl = require("../services/systemdControl");
const { recordAdminAction } = require("../services/auditLog");
const { verifyCsrf } = require("../middleware/csrf");

const router = express.Router();

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
  const minutes = parseInt(req.body.minutes, 10);
  redirectWithResult(res, slug, systemdControl.setTimerInterval(slug, minutes), "interval_change", `${minutes} daqiqa`);
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
