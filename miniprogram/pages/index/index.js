const db = wx.cloud.database()

function enrich(it) {
  let days = 1
  if (it.date) {
    const t = new Date(it.date.replace(/-/g, '/')).getTime()
    days = Math.max(1, Math.floor((Date.now() - t) / 86400000) + 1)
  }
  it.days = days
  return it
}

Page({
  data: { items: [], filtered: [], keyword: '', cats: ['全部'], activeCat: '全部' },

  onShow() {
    this.loadItems()
  },

  loadItems() {
    wx.showLoading({ title: '加载中' })
    db.collection('items').orderBy('createdAt', 'desc').limit(100).get()
      .then(res => {
        const items = res.data.map(enrich)
        const cats = ['全部']
        items.forEach(it => {
          if (it.category && !cats.includes(it.category)) cats.push(it.category)
        })
        let activeCat = this.data.activeCat
        if (!cats.includes(activeCat)) activeCat = '全部'
        this.setData({ items, cats, activeCat })
        this.applyFilter()
      })
      .catch(err => {
        console.error(err)
        wx.showToast({ title: '加载失败，截图找我', icon: 'none' })
      })
      .finally(() => wx.hideLoading())
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value })
    this.applyFilter()
  },

  onCat(e) {
    this.setData({ activeCat: e.currentTarget.dataset.c })
    this.applyFilter()
  },

  applyFilter() {
    const kw = this.data.keyword.trim()
    const cat = this.data.activeCat
    const filtered = this.data.items.filter(it => {
      const okCat = cat === '全部' || it.category === cat
      const okKw = !kw || it.name.includes(kw) ||
        (it.tags || []).some(t => t.includes(kw)) ||
        (it.category || '').includes(kw)
      return okCat && okKw
    })
    this.setData({ filtered })
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/add/add' })
  },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  }
})