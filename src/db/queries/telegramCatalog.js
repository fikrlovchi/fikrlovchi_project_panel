const db = require("../index");

const stmts = {
  listBots: db.prepare("SELECT * FROM telegram_bots ORDER BY name"),
  getBot: db.prepare("SELECT * FROM telegram_bots WHERE id = ?"),
  createBot: db.prepare("INSERT INTO telegram_bots (name, bot_token) VALUES (?, ?)"),
  deleteBot: db.prepare("DELETE FROM telegram_bots WHERE id = ?"),

  listChatsByBot: db.prepare("SELECT * FROM telegram_chats WHERE bot_id = ? ORDER BY name"),
  listAllChats: db.prepare("SELECT * FROM telegram_chats ORDER BY name"),
  getChat: db.prepare("SELECT * FROM telegram_chats WHERE id = ?"),
  createChat: db.prepare("INSERT INTO telegram_chats (bot_id, name, chat_id) VALUES (?, ?, ?)"),
  deleteChat: db.prepare("DELETE FROM telegram_chats WHERE id = ?"),

  listTopicsByChat: db.prepare("SELECT * FROM telegram_topics WHERE chat_id = ? ORDER BY name"),
  listAllTopics: db.prepare("SELECT * FROM telegram_topics ORDER BY name"),
  getTopic: db.prepare("SELECT * FROM telegram_topics WHERE id = ?"),
  createTopic: db.prepare("INSERT INTO telegram_topics (chat_id, name, topic_id) VALUES (?, ?, ?)"),
  deleteTopic: db.prepare("DELETE FROM telegram_topics WHERE id = ?"),
};

function listBots() {
  return stmts.listBots.all();
}
function getBot(id) {
  return stmts.getBot.get(id);
}
function createBot(name, botToken) {
  return stmts.createBot.run(name, botToken).lastInsertRowid;
}
function deleteBot(id) {
  stmts.deleteBot.run(id);
}

function listChatsByBot(botId) {
  return stmts.listChatsByBot.all(botId);
}
function getChat(id) {
  return stmts.getChat.get(id);
}
function createChat(botId, name, chatId) {
  return stmts.createChat.run(botId, name, chatId).lastInsertRowid;
}
function deleteChat(id) {
  stmts.deleteChat.run(id);
}

function listTopicsByChat(chatId) {
  return stmts.listTopicsByChat.all(chatId);
}
function getTopic(id) {
  return stmts.getTopic.get(id);
}
function createTopic(chatId, name, topicId) {
  return stmts.createTopic.run(chatId, name, topicId).lastInsertRowid;
}
function deleteTopic(id) {
  stmts.deleteTopic.run(id);
}

// Bots -> Chats -> Topics daraxtini bitta chaqiruvda yig'ib qaytaradi (sahifa render qilish uchun).
function listAllForCatalog() {
  const bots = stmts.listBots.all();
  const chats = stmts.listAllChats.all();
  const topics = stmts.listAllTopics.all();

  return bots.map((bot) => ({
    ...bot,
    chats: chats
      .filter((c) => c.bot_id === bot.id)
      .map((chat) => ({
        ...chat,
        topics: topics.filter((t) => t.chat_id === chat.id),
      })),
  }));
}

// Loyiha sahifasidagi Chat/Topic select'larini to'ldirish uchun tekis ro'yxat.
function listFlatChatsWithBot() {
  return stmts.listAllChats.all().map((chat) => ({
    ...chat,
    bot: getBot(chat.bot_id),
  }));
}

function listFlatTopicsWithChat() {
  return stmts.listAllTopics.all().map((topic) => ({
    ...topic,
    chat: getChat(topic.chat_id),
  }));
}

module.exports = {
  listBots,
  getBot,
  createBot,
  deleteBot,
  listChatsByBot,
  getChat,
  createChat,
  deleteChat,
  listTopicsByChat,
  getTopic,
  createTopic,
  deleteTopic,
  listAllForCatalog,
  listFlatChatsWithBot,
  listFlatTopicsWithChat,
};
