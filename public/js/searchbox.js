import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

let searchBoxTimeout

export function init () {
  if (!JH.query('#globalsearch')) {
    return
  }
  if (!JH.query('#searchbox')) {
    return
  }

  JH.event('#globalsearch', 'sl-blur', async (ev) => {
    searchBoxHide()
    JH.value('#globalsearch', '')
  })

  JH.event('#globalsearch', 'sl-clear', async (ev) => {
    searchBoxHide()
  })

  JH.event('#searchboxmore', 'click', async (ev) => {
    window.location = `/pages/search?search=${encodeURIComponent(JH.value('#globalsearch'))}`
  })

  JH.event('#globalsearch', 'keyup', async (ev) => {
    const searchLength = JH.value('#globalsearch').length
    JH.query('#searchbox').style.visibility = searchLength === 0 ? 'hidden' : 'visible'

    if (searchLength === 0) {
      searchBoxHide()
      return
    }

    if (searchBoxTimeout) {
      clearTimeout(searchBoxTimeout)
    }
    searchBoxTimeout = setTimeout(async () => { await fillItems() }, 250)
  })

  JH.event(document, 'keydown', (ev) => {
    if (ev.ctrlKey && ev.keyCode === 220) {
      JH.query('#globalsearch').focus()
    }
  })
}

function searchBoxHide () {
  setTimeout(() => {
    JH.query('#searchbox').style.visibility = 'hidden'
    JH.query('#searchboxmore').style.visibility = 'hidden'
  }, 250)
}

async function fillItems () {
  const maxResults = 10

  JH.query('#searchbox tbody').innerHTML =
  `<tr>
    <td><sl-skeleton style='width:5rem;height:1rem;display:flex;'></sl-skeleton></td>
    <td><sl-skeleton style='width:5rem;height:1rem;display:flex;'></sl-skeleton></td>
    <td></td>
    <td><sl-skeleton style='width:5rem;height:1rem;display:flex;'></sl-skeleton></td>
    </tr>`

  const search = JH.value('#globalsearch')
  const resp = await JH.http(`/api/itemssearch?search=${search}&limit=${maxResults + 1}`)

  // Folder may not be accessible
  if (!await PW.checkResponse(resp, 403)) {
    return
  }

  const body = await resp.json()
  if (body.data.length) {
    let row = ''
    let count = 0

    for (const itm of body.data) {
      row +=
        `<tr id='sbrow-${itm.id}' data-id='${itm.id}'>` +
        `<td class='border-start border-end'>${itm.folder.description}</td>` +
        '<td class="border-end">'
      if (itm.type) {
        row += `<sl-icon name='${itm.itemtype.icon}' title='${itm.itemtype.description}'></sl-icon>`
      }
      row += '</td>'
      row += `<td class='itemtitle'>${itm.title}</td></tr>`
      count++
      if (count >= maxResults) {
        break
      }
    }
    JH.query('#searchbox tbody').innerHTML = row
    JH.query('#searchboxmore').style.visibility = body.data.length > maxResults ? 'visible' : 'hidden'

    // Install event handlers
    JH.event('#searchbox tbody [id^=sbrow]', 'mousedown', (ev) => {
      console.log('redirecting')
      window.location = `/pages/items?viewitem=${ev.currentTarget.getAttribute('data-id')}`
    })
  } else {
    JH.query('#searchbox tbody').innerHTML = '<tr><td colspan="99">No matching item found</td></tr>'
    JH.query('#searchboxmore').style.visibility = 'hidden'
  }
}
