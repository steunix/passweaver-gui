var itemSearchTimeout

async function fillItems() {
  jhQuery("#itemstable tbody").innerHTML = ""

  const resp = await jhFetch(`/api/itemssearch?search=${$("#itemsearch").val()}`)

  // Folder may not be accessible
  if ( !await checkResponse2(resp,403) ) {
    return
  }

  const body = await resp.json()
  if ( body.data.length ) {
    let row = ""
    for ( const itm of body.data ) {
      row +=
        `<tr id='row-${itm.id}' data-id='${itm.id}'>`+
        `<td><sl-icon-button id='view-${itm.id}' title='View item' name='file-earmark' data-id='${itm.id}'></sl-icon-button></td>`+
        `<td class='border-start'>${itm.folder.description}</td>`+
        `<td>${itm.title}</td></tr>`
    }
    jhQuery("#itemstable tbody").innerHTML = row
  }

  // Install event handlers
  jhEvent("#itemstable tbody tr[id^=row]", "dblclick", async (ev)=>{
    await itemShow($(ev.currentTarget).data("id"))
  })
  jhEvent("#itemstable tbody [id^=view]", "click", async (ev)=>{
    await itemShow($(ev.currentTarget).data("id"))
  })
}

async function itemViewFill(item) {
  const resp = await jhFetch(`/api/items/${item}`)
  if ( !await checkResponse2(resp) ) {
    jhQuery("#itemviewdialog").hide()
    return
  }

  const body = await resp.json()
  jhValue("#viewtitle", body.data.title)
  jhValue("#viewemail", body.data.data.email)
  jhValue("#viewdescription", body.data.data.description)
  jhValue("#viewurl", body.data.data.url)
  jhValue("#viewuser", body.data.data.user)
  jhQuery("#viewpassword", body.data.data.password).setAttribute("type","password")
}

async function itemShow(item) {
  if ( window.getSelection() ) {
    window.getSelection().empty()
  }
  jhQuery("#itemviewdialog").show()
  await itemViewFill(item)
}

jhEvent("#itemsearch", "sl-input", async (ev) => {
  if ( itemSearchTimeout ) {
    clearTimeout(itemSearchTimeout)
  }
  if ( $("#itemsearch").val().length>2 ) {
    itemSearchTimeout = setTimeout(async() => { await fillItems() },250)
  }
})