import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

let searchBoxTimeout

const domCache = {
  globalSearch: JH.query('#globalsearch'),
  searchBox: JH.query('#searchbox'),
  searchBoxBody: JH.query('#searchbox tbody'),
  searchBoxMore: JH.query('#searchboxmore')
}

export function init () {
  if (!domCache.globalSearch) {
    return
  }
  if (!domCache.searchBox) {
    return
  }

  JH.event(domCache.globalSearch, 'sl-blur', async (ev) => {
    searchBoxHide()
  })

  JH.event(domCache.globalSearch, 'sl-clear', async (ev) => {
    searchBoxHide()
  })

  JH.event(domCache.searchBoxMore, 'click', async (ev) => {
    window.location = `/pages/search?search=${encodeURIComponent(JH.value(domCache.globalSearch))}`
  })

  JH.event(domCache.globalSearch, 'keyup', async (ev) => {
    const searchLength = JH.value(domCache.globalSearch).length
    domCache.searchBox.style.visibility = searchLength === 0 ? 'hidden' : 'visible'

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
      domCache.globalSearch.focus()
    }
  })
}

function searchBoxHide () {
  setTimeout(() => {
    domCache.searchBox.style.visibility = 'hidden'
    domCache.searchBoxMore.style.visibility = 'hidden'
    JH.value(domCache.globalSearch, '')
  }, 250)
}

async function fillItems () {
  const maxResults = 10

  PW.setTableLoading(domCache.searchBox)

  const search = JH.value(domCache.globalSearch)
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

    domCache.searchBoxBody.innerHTML = row
    domCache.searchBoxMore.style.visibility = body.data.length > maxResults ? 'visible' : 'hidden'

    // Install event handlers
    JH.event('#searchbox tbody [id^=sbrow]', 'mousedown', (ev) => {
      console.log('redirecting')
      window.location = `/pages/items?viewitem=${ev.currentTarget.getAttribute('data-id')}`
    })
  } else {
    domCache.searchBoxBody.innerHTML = '<tr><td colspan="99">No matching item found</td></tr>'
    domCache.searchBoxMore.style.visibility = 'hidden'
  }
}
