// Telegram Chat tanlanganda Topic select'ini shu chatga tegishli variantlar bilan
// cheklaydi. JS o'chirilgan bo'lsa ham forma ishlaydi (barcha topic'lar ko'rinadi).
(function () {
  var chatSelect = document.getElementById("telegram-chat-select");
  var topicSelect = document.getElementById("telegram-topic-select");
  if (!chatSelect || !topicSelect) return;

  function applyFilter() {
    var chatId = chatSelect.value;
    var options = topicSelect.querySelectorAll("option[data-chat-id]");
    options.forEach(function (opt) {
      var matches = !chatId || opt.getAttribute("data-chat-id") === chatId;
      opt.hidden = !matches;
      opt.disabled = !matches;
      if (!matches && opt.selected) opt.selected = false;
    });
  }

  chatSelect.addEventListener("change", applyFilter);
  applyFilter();
})();
