import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

export function init () {
  if (!JH.query('#globalsearch')) {
    return
  }
  if (!JH.query('#searchbox')) {
    return
  }

  JH.event('#globalsearch', 'keyup', async (ev) => {
    const searchLength = JH.value('#globalsearch').length
    JH.query('#searchbox').style.visibility = searchLength === 0 ? 'hidden' : 'visible'

    if (searchLength === 0) {
      return
    }

    await fillItems()
  })

  JH.event(document, 'keydown', (ev) => {
    if (ev.ctrlKey && ev.keyCode === 220) {
      JH.query('#globalsearch').focus()
    }
  })
}

async function fillItems () {
  const search = JH.value('#globalsearch')
  const resp = await JH.http(`/api/itemssearch?search=${search}`)

  // Folder may not be accessible
  if (!await PW.checkResponse(resp, 403)) {
    return
  }

  JH.query('#searchbox tbody').innerHTML =
  `<tr>
    <td><sl-skeleton style='width:5rem;height:1rem;display:flex;'></sl-skeleton></td>
    <td><sl-skeleton style='width:5rem;height:1rem;display:flex;'></sl-skeleton></td>
    <td><sl-skeleton style='width:5rem;height:1rem;display:flex;'></sl-skeleton></td>
    <td></td>
    <td><sl-skeleton style='width:5rem;height:1rem;display:flex;'></sl-skeleton></td>
    </tr>`

  const body = await resp.json()
  if (body.data.length) {
    let row = ''
    for (const itm of body.data) {
      row +=
        `<tr id='row-${itm.id}' data-id='${itm.id}'>` +
        '<td>' +
        `<sl-icon-button id='folder-${itm.id}' title='Open folder' name='folder2-open' data-id='${itm.id}'></sl-icon-button>` +
        '</td>' +
        `<td class='border-start border-end'>${itm.folder.description}</td>` +
        '<td class="border-end">'
      if (itm.type) {
        row += `<sl-icon name='${itm.itemtype.icon}' title='${itm.itemtype.description}'></sl-icon>`
      }
      row += '</td>'
      row += `<td class='itemtitle'>${itm.title}</td></tr>`
    }
    JH.query('#searchbox tbody').innerHTML = row
  } else {
    JH.query('#searchbox tbody').innerHTML = '<tr><td colspan="99">No matching item found</td></tr>'
  }

  // Install event handlers
  JH.event('#searchbox tbody [id^=folder]', 'click', (ev) => {
    window.location = `/pages/items?viewitem=${ev.currentTarget.getAttribute('data-id')}`
  })
}
