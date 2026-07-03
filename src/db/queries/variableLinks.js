const db = require("../index");

const stmts = {
  getTelegramLinkForProject: db.prepare("SELECT * FROM project_telegram_links WHERE project_id = ?"),
  upsertTelegramLink: db.prepare(`
    INSERT INTO project_telegram_links (project_id, chat_id, topic_id) VALUES (?, ?, ?)
    ON CONFLICT(project_id) DO UPDATE SET chat_id = excluded.chat_id, topic_id = excluded.topic_id
  `),

  projectsForChat: db.prepare(`
    SELECT p.slug, p.display_name FROM project_telegram_links l
    JOIN projects p ON p.id = l.project_id
    WHERE l.chat_id = ?
    ORDER BY p.display_name
  `),
  projectsForTopic: db.prepare(`
    SELECT p.slug, p.display_name FROM project_telegram_links l
    JOIN projects p ON p.id = l.project_id
    WHERE l.topic_id = ?
    ORDER BY p.display_name
  `),
  projectsForBot: db.prepare(`
    SELECT DISTINCT p.slug, p.display_name FROM project_telegram_links l
    JOIN projects p ON p.id = l.project_id
    JOIN telegram_chats c ON c.id = l.chat_id
    WHERE c.bot_id = ?
    ORDER BY p.display_name
  `),

  listSheetLinksForProject: db.prepare("SELECT * FROM project_sheet_links WHERE project_id = ?"),
  addSheetLink: db.prepare(
    "INSERT OR IGNORE INTO project_sheet_links (project_id, sheet_id, list_id) VALUES (?, ?, ?)"
  ),
  deleteSheetLinksForProject: db.prepare("DELETE FROM project_sheet_links WHERE project_id = ?"),

  projectsForSheet: db.prepare(`
    SELECT DISTINCT p.slug, p.display_name FROM project_sheet_links l
    JOIN projects p ON p.id = l.project_id
    WHERE l.sheet_id = ?
    ORDER BY p.display_name
  `),
  projectsForList: db.prepare(`
    SELECT p.slug, p.display_name FROM project_sheet_links l
    JOIN projects p ON p.id = l.project_id
    WHERE l.list_id = ?
    ORDER BY p.display_name
  `),
};

function getTelegramLinkForProject(projectId) {
  return stmts.getTelegramLinkForProject.get(projectId);
}
function setTelegramLink(projectId, chatId, topicId) {
  stmts.upsertTelegramLink.run(projectId, chatId, topicId || null);
}

function getProjectsLinkedToChat(chatId) {
  return stmts.projectsForChat.all(chatId);
}
function getProjectsLinkedToTopic(topicId) {
  return stmts.projectsForTopic.all(topicId);
}
function getProjectsLinkedToBot(botId) {
  return stmts.projectsForBot.all(botId);
}

function listSheetLinksForProject(projectId) {
  return stmts.listSheetLinksForProject.all(projectId);
}
function setSheetLinks(projectId, links) {
  const tx = db.transaction((rows) => {
    stmts.deleteSheetLinksForProject.run(projectId);
    for (const { sheetId, listId } of rows) {
      stmts.addSheetLink.run(projectId, sheetId, listId || null);
    }
  });
  tx(links);
}

function getProjectsLinkedToSheet(sheetId) {
  return stmts.projectsForSheet.all(sheetId);
}
function getProjectsLinkedToList(listId) {
  return stmts.projectsForList.all(listId);
}

module.exports = {
  getTelegramLinkForProject,
  setTelegramLink,
  getProjectsLinkedToChat,
  getProjectsLinkedToTopic,
  getProjectsLinkedToBot,
  listSheetLinksForProject,
  setSheetLinks,
  getProjectsLinkedToSheet,
  getProjectsLinkedToList,
};
