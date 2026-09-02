const db = wx.cloud.database()

Page({
  data: {
    item: null,
    days: 1,
    perDay: '',
    sourceText: '',
    statuses: ['在用', '用完', '闲置', '送出', '丢弃']
  },

  onLoad(options) {
    this.id = options.id
  },

  onShow() {
    this.load()
  },

  load() {
    db.collection('items').doc(this.id).get().then(res => {
      const it = res.data
      let days = 1
      if (it.date) {
        const t = new Date(it.date.replace(/-/g, '/')).getTime()
        days = Math.max(1, Math.floor((Date.now() - t) / 86400000) + 1)
      }
      let perDay = ''
      if (it.price || it.price === 0) {
        const v = it.price / days
        perDay = v < 0.01 ? '不到 1 分钱' : '¥' + v.toFixed(2)
      }
      let sourceText = ''
      if (it.source === '礼物') {
        sourceText = '🎁 ' + (it.giver ? it.giver + ' 送的' : '别人送的')
      } else if (it.source) {
        sourceText = it.source
      }
      this.setData({ item: it, days: days, perDay: perDay, sourceText: sourceText })
    }).catch(err => {
      console.error(err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    })
  },

  setStatus(e) {
    const s = e.currentTarget.dataset.s
    db.collection('items').doc(this.id).update({ data: { status: s } })
      .then(() => {
        this.load()
        if (s === '用完') this.askRebuy()
      })
      .catch(() => wx.showToast({ title: '没改成功，再试试', icon: 'none' }))
  },

  askRebuy() {
    wx.showActionSheet({
      alertText: '用完啦！灵魂拷问：还买吗？',
      itemList: ['还会回购', '不买了', '以后再想'],
      success: res => {
        const ans = ['还会回购', '不买了', '以后再想'][res.tapIndex]
        db.collection('items').doc(this.id).update({ data: { rebuy: ans } })
          .then(() => this.load())
      }
    })
  },

  goEdit() {
    wx.navigateTo({ url: '/pages/add/add?id=' + this.id })
  },

  onDelete() {
    wx.showModal({
      title: '删除物品',
      content: '确定和「' + this.data.item.name + '」永别吗？',
      success: res => {
        if (!res.confirm) return
        db.collection('items').doc(this.id).remove()
          .then(() => wx.navigateBack())
          .catch(() => wx.showToast({ title: '删除失败', icon: 'none' }))
      }
    })
  }
})