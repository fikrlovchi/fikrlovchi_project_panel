const express = require("express");
const telegramCatalog = require("../db/queries/telegramCatalog");
const sheetsCatalog = require("../db/queries/sheetsCatalog");
const variableLinks = require("../db/queries/variableLinks");
const envFileEditor = require("../services/envFileEditor");
const { recordAdminAction } = require("../services/auditLog");
const { ensureCsrfToken, verifyCsrf } = require("../middleware/csrf");

const router = express.Router();

function redirectBack(res, ok, error) {
  const qs = ok ? `ok=${encodeURIComponent(ok)}` : `error=${encodeURIComponent(error)}`;
  res.redirect(`/variables?${qs}`);
}

router.get("/variables", (req, res) => {
  const telegramBots = telegramCatalog.listAllForCatalog().map((bot) => ({
    ...bot,
    botTokenMasked: envFileEditor.maskSecret(bot.bot_token),
    linkedProjects: variableLinks.getProjectsLinkedToBot(bot.id),
    chats: bot.chats.map((chat) => ({
      ...chat,
      linkedProjects: variableLinks.getProjectsLinkedToChat(chat.id),
      topics: chat.topics.map((topic) => ({
        ...topic,
        linkedProjects: variableLinks.getProjectsLinkedToTopic(topic.id),
      })),
    })),
  }));

  const sheets = sheetsCatalog.listAllForCatalog().map((sheet) => ({
    ...sheet,
    linkedProjects: variableLinks.getProjectsLinkedToSheet(sheet.id),
    lists: sheet.lists.map((list) => ({
      ...list,
      linkedProjects: variableLinks.getProjectsLinkedToList(list.id),
    })),
  }));

  res.render("variables", {
    telegramBots,
    sheets,
    csrfToken: ensureCsrfToken(req),
    actionMessage: req.query.ok,
    errorMessage: req.query.error,
  });
});

router.post("/variables/telegram/bots", verifyCsrf, (req, res) => {
  const name = (req.body.name || "").trim();
  const botToken = (req.body.botToken || "").trim();
  if (!name || !botToken) return redirectBack(res, null, "Nom va bot token to'ldirilishi shart");
  telegramCatalog.createBot(name, botToken);
  recordAdminAction("variable_create", "telegram_bot", name);
  redirectBack(res, "Bot qo'shildi");
});

router.post("/variables/telegram/bots/:id/delete", verifyCsrf, (req, res) => {
  telegramCatalog.deleteBot(req.params.id);
  recordAdminAction("variable_delete", "telegram_bot", req.params.id);
  redirectBack(res, "Bot o'chirildi");
});

router.post("/variables/telegram/chats", verifyCsrf, (req, res) => {
  const { botId, name, chatId } = req.body;
  if (!botId || !name || !chatId) return redirectBack(res, null, "Barcha maydonlar to'ldirilishi shart");
  telegramCatalog.createChat(botId, name.trim(), chatId.trim());
  recordAdminAction("variable_create", "telegram_chat", name);
  redirectBack(res, "Chat qo'shildi");
});

router.post("/variables/telegram/chats/:id/delete", verifyCsrf, (req, res) => {
  telegramCatalog.deleteChat(req.params.id);
  recordAdminAction("variable_delete", "telegram_chat", req.params.id);
  redirectBack(res, "Chat o'chirildi");
});

router.post("/variables/telegram/topics", verifyCsrf, (req, res) => {
  const { chatId, name, topicId } = req.body;
  if (!chatId || !name || !topicId) return redirectBack(res, null, "Barcha maydonlar to'ldirilishi shart");
  telegramCatalog.createTopic(chatId, name.trim(), topicId.trim());
  recordAdminAction("variable_create", "telegram_topic", name);
  redirectBack(res, "Topic qo'shildi");
});

router.post("/variables/telegram/topics/:id/delete", verifyCsrf, (req, res) => {
  telegramCatalog.deleteTopic(req.params.id);
  recordAdminAction("variable_delete", "telegram_topic", req.params.id);
  redirectBack(res, "Topic o'chirildi");
});

router.post("/variables/sheets", verifyCsrf, (req, res) => {
  const name = (req.body.name || "").trim();
  const sheetId = (req.body.sheetId || "").trim();
  if (!name || !sheetId) return redirectBack(res, null, "Nom va Sheet ID to'ldirilishi shart");
  sheetsCatalog.createSheet(name, sheetId);
  recordAdminAction("variable_create", "google_sheet", name);
  redirectBack(res, "Sheet qo'shildi");
});

router.post("/variables/sheets/:id/delete", verifyCsrf, (req, res) => {
  sheetsCatalog.deleteSheet(req.params.id);
  recordAdminAction("variable_delete", "google_sheet", req.params.id);
  redirectBack(res, "Sheet o'chirildi");
});

router.post("/variables/sheets/lists", verifyCsrf, (req, res) => {
  const { sheetId, name, listName } = req.body;
  if (!sheetId || !name || !listName) return redirectBack(res, null, "Barcha maydonlar to'ldirilishi shart");
  sheetsCatalog.createList(sheetId, name.trim(), listName.trim());
  recordAdminAction("variable_create", "sheet_list", name);
  redirectBack(res, "List qo'shildi");
});

router.post("/variables/sheets/lists/:id/delete", verifyCsrf, (req, res) => {
  sheetsCatalog.deleteList(req.params.id);
  recordAdminAction("variable_delete", "sheet_list", req.params.id);
  redirectBack(res, "List o'chirildi");
});

module.exports = router;
