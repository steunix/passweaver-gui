import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

let groupPickerTimeout = 0
let userCallback

export function show (callback) {
  userCallback = callback
  JH.value('#grouppickersearch', '')
  JH.query('#grouppickertable tbody').innerHTML = ''
  JH.query('#grouppickerdialog').show()
  search()
}

export function hide () {
  JH.query('#grouppickerdialog').hide()
}

async function search () {
  const text = JH.value('#grouppickersearch')

  const resp = await JH.http(`/api/groupslist/?search=${encodeURIComponent(text)}`)
  if (!await PW.checkResponse(resp)) {
    return
  }

  JH.query('#grouppickertable tbody').innerHTML = ''
  const body = await resp.json()
  if (body.data.length) {
    let row = ''
    for (const grp of body.data) {
      row +=
        `<tr id='row-${grp.id}' data-id='${grp.id}' style='cursor:pointer'>` +
        `<td><sl-icon-button id='choose-${grp.id}' data-id='${grp.id}' name='arrow-right-circle'></sl-icon-button></td>` +
        `<td>${grp.description}</td>` +
        '</tr>'
    }
    JH.query('#grouppickertable tbody').innerHTML = row

    // Install event handlers
    JH.event('#grouppickertable tbody tr[id^=row]', 'dblclick', (ev) => {
      userCallback(ev.currentTarget.getAttribute('data-id'))
    })
    JH.event('#grouppickertable tbody [id^=choose]', 'click', (ev) => {
      userCallback(ev.currentTarget.getAttribute('data-id'))
    })
  }
}

JH.event('#grouppickersearch', 'sl-input', (ev) => {
  if (groupPickerTimeout) {
    clearTimeout(groupPickerTimeout)
  }
  groupPickerTimeout = setTimeout(async () => { await search() }, 250)
})
