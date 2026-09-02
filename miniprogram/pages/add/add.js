const db = wx.cloud.database()

const PRESETS = ['服饰鞋包', '美妆护肤', '个护清洁', '数码电子', '家居日用',
  '厨房餐厨', '食品饮料', '文具办公', '运动户外', '书籍文娱', '药品保健', '其他']

const SOURCES = ['淘宝', '京东', '拼多多', '抖音', '线下店', '其他']

function today() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return d.getFullYear() + '-' + m + '-' + day
}

Page({
  data: {
    id: '',
    cats: PRESETS,
    category: '',
    sources: SOURCES,
    source: '',
    isGift: false,
    giver: '',
    priceText: '',
    name: '',
    tagsText: '',
    note: '',
    date: '',
    photoTemp: '',
    photoOld: '',
    saving: false
  },

  onLoad(options) {
    this.setData({ date: today() })
    this.loadCustomCats()
    if (options && options.id) {
      this.setData({ id: options.id })
      wx.setNavigationBarTitle({ title: '改一改' })
      db.collection('items').doc(options.id).get().then(res => {
        const it = res.data
        const patch = {
          name: it.name || '',
          category: it.category || '',
          tagsText: (it.tags || []).join(' '),
          note: it.note || '',
          date: it.date || today(),
          photoTemp: it.photo || '',
          photoOld: it.photo || '',
          priceText: (it.price || it.price === 0) ? String(it.price) : '',
          isGift: it.source === '礼物',
          source: it.source === '礼物' ? '' : (it.source || ''),
          giver: it.giver || ''
        }
        if (it.category && this.data.cats.indexOf(it.category) === -1) {
          patch.cats = this.data.cats.concat(it.category)
        }
        this.setData(patch)
      })
    }
  },

  loadCustomCats() {
    db.collection('items').field({ category: true }).limit(100).get().then(res => {
      const extra = []
      res.data.forEach(d => {
        if (d.category && PRESETS.indexOf(d.category) === -1 && extra.indexOf(d.category) === -1) {
          extra.push(d.category)
        }
      })
      if (extra.length) this.setData({ cats: PRESETS.concat(extra) })
    })
  },

  onName(e) { this.setData({ name: e.detail.value }) },
  onTags(e) { this.setData({ tagsText: e.detail.value }) },
  onNote(e) { this.setData({ note: e.detail.value }) },
  onDate(e) { this.setData({ date: e.detail.value }) },
  onPrice(e) { this.setData({ priceText: e.detail.value }) },
  onGiver(e) { this.setData({ giver: e.detail.value }) },

  pickCat(e) {
    const c = e.currentTarget.dataset.c
    this.setData({ category: this.data.category === c ? '' : c })
  },

  addCat() {
    wx.showModal({
      title: '新分类',
      editable: true,
      placeholderText: '比如：香薰蜡烛',
      success: res => {
        if (res.confirm && res.content && res.content.trim()) {
          const c = res.content.trim()
          const cats = this.data.cats.indexOf(c) === -1
            ? this.data.cats.concat(c) : this.data.cats
          this.setData({ cats: cats, category: c })
        }
      }
    })
  },

  pickSource(e) {
    const s = e.currentTarget.dataset.s
    this.setData({ source: this.data.source === s ? '' : s, isGift: false })
  },

  pickGift() {
    this.setData({ isGift: !this.data.isGift, source: '' })
  },

  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: res => this.setData({ photoTemp: res.tempFiles[0].tempFilePath })
    })
  },

  async compress(filePath) {
    try {
      const res = await wx.compressImage({ src: filePath, quality: 50 })
      return res.tempFilePath || filePath
    } catch (e) {
      return filePath
    }
  },

  async save() {
    const name = this.data.name.trim()
    if (!name) {
      wx.showToast({ title: '名称要填一下哦', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    try {
      let photo = this.data.photoOld
      if (this.data.photoTemp && this.data.photoTemp !== this.data.photoOld) {
        const small = await this.compress(this.data.photoTemp)
        const up = await wx.cloud.uploadFile({
          cloudPath: 'items/' + Date.now() + '-' + Math.floor(Math.random() * 10000) + '.jpg',
          filePath: small
        })
        photo = up.fileID
      }
      const tags = this.data.tagsText.trim()
        ? this.data.tagsText.trim().split(/\s+/) : []
      const priceNum = parseFloat(this.data.priceText)
      const payload = {
        name: name,
        category: this.data.category,
        tags: tags,
        date: this.data.date,
        note: this.data.note.trim(),
        photo: photo,
        price: isNaN(priceNum) ? null : priceNum,
        source: this.data.isGift ? '礼物' : this.data.source,
        giver: this.data.isGift ? this.data.giver.trim() : ''
      }
      if (this.data.id) {
        await db.collection('items').doc(this.data.id).update({ data: payload })
      } else {
        payload.status = '在用'
        payload.rebuy = ''
        payload.createdAt = db.serverDate()
        await db.collection('items').add({ data: payload })
      }
      wx.showToast({ title: '记下啦' })
      setTimeout(() => wx.navigateBack(), 600)
    } catch (err) {
      console.error(err)
      wx.showToast({ title: '保存失败，截图找我', icon: 'none' })
      this.setData({ saving: false })
    }
  }
})