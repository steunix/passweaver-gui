import * as JH from './jh.js'
import * as PW from './passweaver-gui.js'

let itemSearchTimeout
let itemTypesOptions

const domCache = {
  typeSelect: JH.query('#typesearch'),
  itemsTable: JH.query('#itemstable'),
  itemsTableBody: JH.query('#itemstable tbody'),
  search: JH.query('#itemsearch'),
  itemViewDialog: JH.query('#itemviewdialog'),
  itemViewType: JH.query('#viewtype'),
  itemViewId: JH.query('#itemviewid'),
  passwordCopy: JH.query('#itemviewcopypassword'),
  passwordView: JH.query('#viewpassword')
}

async function fillItemTypes () {
  const resp = await JH.http('/api/itemtypes')
  if (!await PW.checkResponse(resp)) {
    return
  }

  itemTypesOptions = ''
  const body = await resp.json()
  for (const itm of body.data) {
    itemTypesOptions += `<sl-option id='itemtype-${itm.id}' value='${itm.id}'>${itm.description}`
    if (itm.icon) {
      itemTypesOptions += `<sl-icon name='${itm.icon}' slot='prefix'>${itm.description}</sl-icon>`
    }
    itemTypesOptions += '</sl-option>'
  }

  domCache.itemViewType.innerHTML = itemTypesOptions
  domCache.typeSelect.innerHTML = itemTypesOptions
}

async function fillItems () {
  PW.setTableLoading(domCache.itemsTable)

  const type = JH.value(domCache.typeSelect)

  const search = JH.value(domCache.search)
  const resp = await JH.http(`/api/itemssearch?search=${search}&type=${type}`)

  // Folder may not be accessible
  if (!await PW.checkResponse(resp, 403)) {
    return
  }

  const body = await resp.json()
  if (body.data.length) {
    let row = ''
    for (const itm of body.data) {
      row +=
        `<tr id='row-${itm.id}' data-id='${itm.id}'>` +
        '<td>' +
        `<sl-icon-button id='view-${itm.id}' title='View item' name='file-earmark' data-id='${itm.id}'></sl-icon-button>` +
        `<sl-icon-button id='link-${itm.id}' title='Copy item link' name='link-45deg' data-id='${itm.id}'></sl-icon-button>` +
        `<sl-icon-button id='folder-${itm.id}' title='Open folder' name='folder2-open' data-id='${itm.id}'></sl-icon-button>` +
        '</td>' +
        `<td class='border-start border-end'>${JH.sanitize(itm.folder.description)}</td>` +
        '<td class="border-end">'
      if (itm.type) {
        row += `<sl-icon name='${itm.itemtype.icon}' title='${JH.sanitize(itm.itemtype.description)}'></sl-icon>`
      }
      row += '</td>'
      row += `<td class='itemtitle'>${JH.sanitize(itm.title)}</td></tr>`
    }
    domCache.itemsTableBody.innerHTML = row
  } else {
    domCache.itemsTableBody.innerHTML = '<tr><td colspan="99">No matching item found</td></tr>'
  }

  // Install event handlers
  JH.event('#itemstable tbody tr[id^=row]', 'dblclick', async (ev) => {
    await itemShow(ev.currentTarget.getAttribute('data-id'))
  })
  JH.event('#itemstable tbody [id^=view]', 'click', async (ev) => {
    await itemShow(ev.currentTarget.getAttribute('data-id'))
  })
  JH.event('#itemstable tbody [id^=link]', 'click', (ev) => {
    itemCopyLink(ev.currentTarget.getAttribute('data-id'))
  })
  JH.event('#itemstable tbody [id^=folder]', 'click', (ev) => {
    window.location = `/pages/items?viewitem=${ev.currentTarget.getAttribute('data-id')}`
  })
}

async function itemViewFill (item) {
  const resp = await JH.http(`/api/items/${item}`)
  if (!await PW.checkResponse(resp)) {
    domCache.itemViewDialog.hide()
    return
  }

  const body = await resp.json()
  body.data.data = JSON.parse(body.data.data)
  JH.value('#itemviewid', item)
  JH.value('#viewtitle', body.data.title)
  JH.value('#viewtype', body.data.type)
  JH.value('#viewemail', body.data.data.email)
  JH.value('#viewdescription', body.data.data.description)
  JH.value('#viewurl', body.data.data.url)
  JH.value('#viewuser', body.data.data.user)
  JH.query('#viewpassword').setAttribute('type', 'password')
  JH.value('#viewpassword', body.data.data.password)
}

async function itemShow (item) {
  if (window.getSelection()) {
    window.getSelection().empty()
  }
  domCache.itemViewDialog.show()
  await itemViewFill(item)
}

function itemCopyLink (itm) {
  navigator.clipboard.writeText(`${window.location.origin}/pages/items?viewitem=${itm}`)
  PW.showToast('primary', 'Item link copied to clipboard')
}

async function passwordAccessed (item) {
  await JH.http('/api/events', {
    _csrf: PW.getCSRFToken(),
    event: 80,
    entity: 30,
    entityid: item
  })
}

async function passwordCopied (item) {
  await JH.http('/api/events', {
    _csrf: PW.getCSRFToken(),
    event: 81,
    entity: 30,
    entityid: item
  })
}

await fillItemTypes()

JH.event(domCache.search, 'sl-input', async (ev) => {
  if (itemSearchTimeout) {
    clearTimeout(itemSearchTimeout)
  }
  itemSearchTimeout = setTimeout(async () => { await fillItems() }, 250)
})

JH.event(domCache.typeSelect, 'sl-change', fillItems)

JH.event(domCache.passwordCopy, 'sl-copy', (ev) => {
  passwordCopied(JH.value(domCache.itemViewId))
})

setTimeout(() => {
  domCache.passwordView.shadowRoot.querySelector('[part=password-toggle-button]').addEventListener('click', (ev) => {
    const el = domCache.passwordView.shadowRoot.querySelector('[part=input]')
    if (el.getAttribute('type') === 'text') {
      passwordAccessed(JH.value(domCache.itemViewId))
    }
  })

  if (JH.value(domCache.search).length) {
    fillItems()
  }
}, 200)
