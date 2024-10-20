/* global jhEvent, jhQuery, jhValue, jhFetch */

import * as PW from './passweaver-gui.js'

let itemSearchTimeout
let itemTypesOptions

async function fillItemTypes () {
  const resp = await jhFetch('/api/itemtypes')
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

  jhQuery('#viewtype').innerHTML = itemTypesOptions
  jhQuery('#typesearch').innerHTML = itemTypesOptions
}

async function fillItems () {
  const type = jhValue('#typesearch')

  const search = jhValue('#itemsearch')
  const resp = await jhFetch(`/api/itemssearch?search=${search}&type=${type}`)

  // Folder may not be accessible
  if (!await PW.checkResponse(resp, 403)) {
    return
  }

  jhQuery('#itemstable tbody').innerHTML =
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
        `<sl-icon-button id='view-${itm.id}' title='View item' name='file-earmark' data-id='${itm.id}'></sl-icon-button>` +
        `<sl-icon-button id='link-${itm.id}' title='Copy item link' name='link-45deg' data-id='${itm.id}'></sl-icon-button>` +
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
    jhQuery('#itemstable tbody').innerHTML = row
  } else {
    jhQuery('#itemstable tbody').innerHTML = '<tr><td colspan="99">No matching item found</td></tr>'
  }

  // Install event handlers
  jhEvent('#itemstable tbody tr[id^=row]', 'dblclick', async (ev) => {
    await itemShow(ev.currentTarget.getAttribute('data-id'))
  })
  jhEvent('#itemstable tbody [id^=view]', 'click', async (ev) => {
    await itemShow(ev.currentTarget.getAttribute('data-id'))
  })
  jhEvent('#itemstable tbody [id^=link]', 'click', (ev) => {
    itemCopyLink(ev.currentTarget.getAttribute('data-id'))
  })
  jhEvent('#itemstable tbody [id^=folder]', 'click', (ev) => {
    window.location = `/pages/items?viewitem=${ev.currentTarget.getAttribute('data-id')}`
  })
}

async function itemViewFill (item) {
  const resp = await jhFetch(`/api/items/${item}`)
  if (!await PW.checkResponse(resp)) {
    jhQuery('#itemviewdialog').hide()
    return
  }

  const body = await resp.json()
  jhValue('#itemviewid', item)
  jhValue('#viewtitle', body.data.title)
  jhValue('#viewtype', body.data.type)
  jhValue('#viewemail', body.data.data.email)
  jhValue('#viewdescription', body.data.data.description)
  jhValue('#viewurl', body.data.data.url)
  jhValue('#viewuser', body.data.data.user)
  jhQuery('#viewpassword').setAttribute('type', 'password')
  jhValue('#viewpassword', body.data.data.password)
}

async function itemShow (item) {
  if (window.getSelection()) {
    window.getSelection().empty()
  }
  jhQuery('#itemviewdialog').show()
  await itemViewFill(item)
}

function itemCopyLink (itm) {
  navigator.clipboard.writeText(`${window.location.origin}/pages/items?viewitem=${itm}`)
  PW.showToast('primary', 'Item link copied to clipboard')
}

async function passwordAccessed (item) {
  await jhFetch('/api/events', {
    _csrf: PW.getCSRFToken(),
    event: 80,
    entity: 30,
    entityid: item
  })
}

async function passwordCopied (item) {
  await jhFetch('/api/events', {
    _csrf: PW.getCSRFToken(),
    event: 81,
    entity: 30,
    entityid: item
  })
}

await fillItemTypes()

jhEvent('#itemsearch', 'sl-input', async (ev) => {
  if (itemSearchTimeout) {
    clearTimeout(itemSearchTimeout)
  }
  if (jhValue('#itemsearch').length > 2) {
    itemSearchTimeout = setTimeout(async () => { await fillItems() }, 250)
  }
})

jhEvent('#typesearch', 'sl-change', () => {
  fillItems()
})

jhQuery('#viewpassword').shadowRoot.querySelector('[part=password-toggle-button]').addEventListener('click', (ev) => {
  const el = jhQuery('#viewpassword').shadowRoot.querySelector('[part=input]')
  if (el.getAttribute('type') === 'text') {
    passwordAccessed(jhValue('#itemviewid'))
  }
})

jhEvent('#itemviewcopypassword', 'sl-copy', (ev) => {
  passwordCopied(jhValue('#itemviewid'))
})

if (jhValue('#itemsearch').length) {
  fillItems()
}
