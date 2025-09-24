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
    tableBody: JH.query('#pickertable tbody')
  }

  constructor (mode, callback) {
    this.clientCallback = callback
    this.mode = mode

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
        row += `<tr id='row-${itm.id}' data-id='${itm.id}' data-desc='${itm.lastname} ${itm.firstname}' style='cursor:pointer;'>`
        row += `<td style="width:1px;"><wa-button id='itm-${itm.id}' data-id='${itm.id}' title="Choose" appearance="plain" size="small"><wa-icon data-desc='${itm.lastname} ${itm.firstname}' name='check' label="Choose"></wa-icon></wa-button></td>`
        if (this.mode === 'users') {
          row += `<td style="width:1px;">${JH.sanitize(itm.login)}</td>`
        }
        row += `<td>${JH.sanitize(desc)}</td>`
        row += '</tr>'
      }
      this.domCache.tableBody.innerHTML = row
    }

    // Event handlers
    JH.event('#pickertable tbody tr[id^=row]', 'dblclick', (ev) => {
      this.clientCallback(ev.currentTarget.getAttribute('data-id'), ev.currentTarget.getAttribute('data-desc'))
    })
    JH.event('#pickertable tbody wa-button[id^=itm]', 'click', (ev) => {
      this.clientCallback(ev.currentTarget.getAttribute('data-id'), ev.currentTarget.getAttribute('data-desc'))
    })
  }

  installEvents () {
    JH.event(this.domCache.search, 'input', (ev) => {
      if (this.pickerTimeout) {
        clearTimeout(this.pickerTimeout)
      }
      this.pickerTimeout = setTimeout(async () => { await this.search() }, 250)
    })
  }
}
