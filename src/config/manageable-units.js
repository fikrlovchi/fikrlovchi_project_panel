// Systemd orqali boshqarilishi mumkin bo'lgan loyihalarning qattiq kodlangan
// ro'yxati. Bu yerga qo'shish — kod o'zgarishi va deploy talab qiladi, shunchaki
// bazaga yozish orqali emas: shu tarzda sessiya o'g'irlansa ham (yoki CSRF
// aylanib o'tilsa ham) hujumchi bazaga yangi loyiha yozib, ixtiyoriy systemd
// unit'ini boshqara olmaydi.
module.exports = {
  'uzum-order-to-mc': {
    serviceUnit: 'uzum-order.service',
    timerUnit: 'uzum-order.timer',
    timerUnitPath: '/etc/systemd/system/uzum-order.timer',
  },
};
