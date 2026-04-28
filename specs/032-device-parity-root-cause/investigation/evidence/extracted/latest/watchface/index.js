const { hmUI } = globalThis;
function px(v) { return v; }
Page({
  build() {
    hmUI.createWidget(hmUI.widget.IMG, {
      src: 'assets/bg.png',
      x: px(0),
      y: px(0),
      show_level: hmUI.show_level.ALL,
    });
    hmUI.createWidget(hmUI.widget.TIME_POINTER, {
      hour: { path: 'assets/hour_hand.png', centerX: px(120), centerY: px(120), posX: px(11), posY: px(70) },
      minute: { path: 'assets/minute_hand.png', centerX: px(120), centerY: px(120), posX: px(8), posY: px(100) },
      second: { path: 'assets/second_hand.png', centerX: px(120), centerY: px(120), posX: px(3), posY: px(120) },
      show_level: hmUI.show_level.ALL,
    });
  },
});
