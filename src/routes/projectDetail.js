const express = require("express");
const projects = require("../db/queries/projects");
const runs = require("../db/queries/runs");
const logEvents = require("../db/queries/logEvents");
const manageableUnits = require("../config/manageable-units");
const systemdControl = require("../services/systemdControl");
const { ensureCsrfToken } = require("../middleware/csrf");

const router = express.Router();
const PAGE_SIZE = 20;

router.get("/projects/:slug", async (req, res) => {
  const project = projects.getBySlug(req.params.slug);
  if (!project) return res.status(404).send("Loyiha topilmadi");

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const totalRuns = runs.countForProject(project.id);
  const runList = runs.listForProject(project.id, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });

  const logsByRun = {};
  for (const r of runList) logsByRun[r.id] = logEvents.listForRun(r.id);

  const isManaged = Boolean(manageableUnits[project.slug]);
  const intervalMinutes = systemdControl.getConfiguredIntervalMinutes(project.slug);

  let liveStatus = null;
  if (isManaged) {
    try {
      liveStatus = await systemdControl.getStatus(project.slug);
    } catch (e) {
      liveStatus = { error: e.message };
    }
  }

  res.render("project-detail", {
    project,
    runs: runList,
    logsByRun,
    totalRuns,
    page,
    pageSize: PAGE_SIZE,
    isManaged,
    intervalMinutes,
    liveStatus,
    csrfToken: ensureCsrfToken(req),
    actionMessage: req.query.ok,
    errorMessage: req.query.error,
  });
});

module.exports = router;
