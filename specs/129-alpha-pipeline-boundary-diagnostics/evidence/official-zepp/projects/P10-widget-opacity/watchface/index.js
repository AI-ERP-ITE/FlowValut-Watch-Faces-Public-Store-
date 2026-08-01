WatchFace({
  build() {
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: 0, y: 0, w: 480, h: 480, color: 0x202020,
    })
    hmUI.createWidget(hmUI.widget.IMG, {
      x: 0, y: 0, src: 'alpha-fixture-opaque.png', alpha: 128,
    })
  },
})
