const express = require("express");
const projects = require("../db/queries/projects");
const runs = require("../db/queries/runs");
const logEvents = require("../db/queries/logEvents");
const manageableUnits = require("../config/manageable-units");
const systemdControl = require("../services/systemdControl");
const telegramCatalog = require("../db/queries/telegramCatalog");
const sheetsCatalog = require("../db/queries/sheetsCatalog");
const apiTokens = require("../db/queries/apiTokens");
const uzumCatalog = require("../db/queries/uzumCatalog");
const variableLinks = require("../db/queries/variableLinks");
const envBindingsQuery = require("../db/queries/envBindings");
const { sourceLabel } = require("../services/envSourceResolver");
const { ensureCsrfToken } = require("../middleware/csrf");
const { formatTashkent } = require("../utils/formatDate");

// Loyiha sahifasidagi "Muhit sozlamalari" kartasida bitta select ichida
// barcha katalog turlarini optgroup qilib ko'rsatish uchun.
function buildEnvSourceGroups() {
  return [
    { label: "Telegram botlar", options: telegramCatalog.listBots().map((b) => ({ value: `telegram_bot:${b.id}`, text: b.name })) },
    {
      label: "Telegram chatlar",
      options: telegramCatalog.listFlatChatsWithBot().map((c) => ({ value: `telegram_chat:${c.id}`, text: `${c.name} (bot: ${c.bot.name})` })),
    },
    {
      label: "Telegram topiclar",
      options: telegramCatalog.listFlatTopicsWithChat().map((t) => ({ value: `telegram_topic:${t.id}`, text: `${t.chat.name} / ${t.name}` })),
    },
    { label: "Tokenlar", options: apiTokens.list().map((t) => ({ value: `api_token:${t.id}`, text: t.name })) },
    { label: "Uzum kabinetlar", options: uzumCatalog.listCabinets().map((c) => ({ value: `uzum_cabinet:${c.id}`, text: c.name })) },
    {
      label: "Uzum do'konlar",
      options: uzumCatalog.listFlatShopsWithCabinet().map((s) => ({ value: `uzum_shop:${s.id}`, text: `${s.cabinet.name} / ${s.name}` })),
    },
  ].filter((group) => group.options.length > 0);
}

const router = express.Router();
const PAGE_SIZE = 20;

// Soniyani eng o'qilishi qulay birlikka aylantiradi (forma uchun boshlang'ich qiymat).
function secondsToAmountUnit(totalSeconds) {
  if (totalSeconds == null) return { amount: "", unit: "min" };
  if (totalSeconds % 3600 === 0) return { amount: totalSeconds / 3600, unit: "h" };
  if (totalSeconds % 60 === 0) return { amount: totalSeconds / 60, unit: "min" };
  return { amount: totalSeconds, unit: "s" };
}

router.get("/projects/:slug", async (req, res) => {
  const project = projects.getBySlug(req.params.slug);
  if (!project) return res.status(404).send("Loyiha topilmadi");

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const totalRuns = runs.countForProject(project.id);
  const runList = runs.listForProject(project.id, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });

  const logsByRun = {};
  for (const r of runList) logsByRun[r.id] = logEvents.listForRun(r.id);

  const unit = manageableUnits[project.slug];
  const isManaged = Boolean(unit);
  const intervalSeconds = systemdControl.getConfiguredIntervalSeconds(project.slug);
  const intervalInput = secondsToAmountUnit(intervalSeconds);

  let liveStatus = null;
  if (isManaged) {
    try {
      liveStatus = await systemdControl.getStatus(project.slug);
    } catch (e) {
      liveStatus = { error: e.message };
    }
  }

  const canManageEnv = Boolean(unit && unit.envPath);
  const envSourceGroups = canManageEnv ? buildEnvSourceGroups() : [];
  const envBindingRows = canManageEnv
    ? envBindingsQuery.listForProject(project.id).map((b) => ({ ...b, label: sourceLabel(b.source_type, b.source_id) }))
    : [];

  const sheets = sheetsCatalog.listSheets();
  const sheetLists = sheetsCatalog.listFlatListsWithSheet();
  const currentSheetLinks = variableLinks.listSheetLinksForProject(project.id);

  res.render("project-detail", {
    project,
    runs: runList,
    logsByRun,
    totalRuns,
    page,
    pageSize: PAGE_SIZE,
    isManaged,
    intervalInput,
    liveStatus,
    canManageEnv,
    envSourceGroups,
    envBindingRows,
    sheets,
    sheetLists,
    currentSheetLinks,
    csrfToken: ensureCsrfToken(req),
    actionMessage: req.query.ok,
    errorMessage: req.query.error,
    formatTashkent,
  });
});

module.exports = router;
