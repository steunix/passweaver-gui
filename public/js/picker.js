import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

export class Picker {
  pickerTimeout = 0
  clientCallback = null
  mode = ''

  domCache = {
    dialog: JH.query('#pickerdialog'),
    search: JH.query('#pickersearch'),
    table: JH.query('#pickertable'),
    tableBody: JH.query('#pickertable tbody'),
    okButton: JH.query('#pickerok')
  }

  constructor (mode, multiple, callback) {
    this.clientCallback = callback
    this.mode = mode
    this.multiple = multiple

    this.domCache.okButton.style.display = this.multiple ? 'block' : 'none'
    this.installEvents()
  }

  show () {
    this.domCache.search.value = ''
    this.domCache.tableBody.innerHTML = ''
    this.domCache.dialog.label = this.mode === 'groups' ? 'Select group' : 'Select user'
    this.domCache.dialog.show()
    this.search()
  }

  hide () {
    this.domCache.dialog.open = false
  }

  async search () {
    PW.setTableLoading(this.domCache.table)

    const text = JH.value(this.domCache.search)
    const par = encodeURIComponent(text)
    const api = this.mode === 'groups' ? '/api/groupslist/' : '/api/userslist/'

    const resp = await JH.http(`${api}?search=${par}`)
    if (!await PW.checkResponse(resp)) {
      return
    }

    this.domCache.tableBody.innerHTML = ''
    const body = await resp.json()
    if (body.data.length) {
      let row = ''
      for (const itm of body.data) {
        let desc
        if (this.mode === 'groups') {
          desc = itm.description
        }
        if (this.mode === 'users') {
          desc = itm.lastname + ' ' + itm.firstname
        }
        row += '<tr>'
        if (this.multiple) {
          row += `<td style='width:40px;'><wa-checkbox id='check-${itm.id}' data-id='${itm.id}' data-desc='${JH.sanitize(desc)}'></wa-checkbox></td>`
        }
        row += `<td><a href="#" id='choose-${itm.id}' data-id='${itm.id}' data-desc='${JH.sanitize(itm.lastname + ' ' + itm.firstname)}' title="Choose">${JH.sanitize(desc)}</a></td>`
        if (this.mode === 'users') {
          row += `<td>${JH.sanitize(itm.login)}</td>`
        }
        row += '</tr>'
      }
      this.domCache.tableBody.innerHTML = row
    }

    // Event handlers
    JH.event('#pickertable tbody a[id^=choose-]', 'click', (ev) => {
      this.clientCallback([{ id: ev.currentTarget.getAttribute('data-id'), desc: ev.currentTarget.getAttribute('data-desc') }])
    })
  }

  installEvents () {
    JH.event(this.domCache.search, 'input', (ev) => {
      if (this.pickerTimeout) {
        clearTimeout(this.pickerTimeout)
      }
      this.pickerTimeout = setTimeout(async () => { await this.search() }, 250)
    })

    if (this.multiple) {
      JH.event(this.domCache.okButton, 'click', (ev) => {
        const checks = JH.queryAll('#pickertable tbody wa-checkbox')
        const selected = []
        for (const check of checks) {
          if (check.checked) {
            selected.push({ id: check.getAttribute('data-id'), desc: check.getAttribute('data-desc') })
          }
        }
        this.clientCallback(selected)
      })
    }
  }
}
