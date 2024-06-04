import * as PW from './passweaver-gui.js'

var currentItemType

async function fillItemTypes() {
  const resp = await jhFetch(`/api/itemtypes`)
  if ( !await PW.checkResponse(resp) ) {
    return
  }

  const body = await resp.json()
  jhQuery("#itemtypestable tbody").innerHTML = ""

  let row = ''
  if ( !body.data.length ) {
    return
  }

  for ( const itm of body.data ) {
    row +=
      `<tr data-id='${itm.id}' style='cursor:pointer'>`+
      `<td><sl-icon-button id='edititemtype-${itm.id}' title='Edit itemtype' name='pencil' data-id='${itm.id}'></sl-icon-button></td>`+
      `<td class='border-end'><sl-icon-button id='removeitemtype-${itm.id}' title='Delete itemtype' name='trash3' style='color:red;' data-id='${itm.id}'></sl-icon-button></td>`+
      `<td>${itm.description}</td>`+
      `<td>${itm.icon}</td>`+
      `<td><sl-icon name='${itm.icon}'></sl-icon></td>`+
      `</tr>`
  }
  jhQuery("#itemtypestable tbody").innerHTML = row

  jhEvent("[id^=removeitemtype-]", "click", async(ev)=>{
    itemTypeRemove(ev.currentTarget.getAttribute("data-id"))
  })
  jhEvent("[id^=edititemtype-]", "click", async(ev)=>{
    itemTypeEditDialog(ev.currentTarget.getAttribute("data-id"))
  })
}

await fillItemTypes()

function itemTypeCreateDialog() {
  jhValue("#itemtypenewdialog sl-input", "")
  jhQuery("#itemtypenewdialog").show()
  itemTypeCreateEnable()
}

function itemTypeCreateEnable() {
  if ( jhValue("#itemtypenewdescription")==="" ) {
    jhQuery("#itemtypenewsave").setAttribute("disabled","disabled")
  } else {
    jhQuery("#itemtypenewsave").removeAttribute("disabled")
  }
}

async function itemTypeCreate() {
  const data = {
    _csrf: PW.getCSRFToken(),
    description: jhValue("#itemtypenewdescription"),
    icon: jhValue("#itemtypenewicon")
  }

  jhQuery("#itemtypenewdialog").hide()

  const resp = await jhFetch("/api/itemtypes", data)
  if ( !await PW.checkResponse(resp) ) {
    return
  }

  await fillItemTypes()
}

async function itemTypeRemove(itemtype) {
  PW.confirmDialog("Remove item type", "Do you want to delete this item type? All items having this type will be reset to null item type", async()=>{
    const data = {
      _csrf: PW.getCSRFToken()
    }

    const resp = await jhFetch(`/api/itemtypes/${itemtype}`, data, "DELETE")
    if ( !await PW.checkResponse(resp) ) {
      return
    }

    PW.showToast("success", "Item type removed")
    await fillItemTypes()
  })
}

async function itemTypeEditDialog(itemtype) {
  currentItemType = itemtype
  const resp = await jhFetch(`/api/itemtypes/${itemtype}`)
  if ( !await PW.checkResponse(resp) ) {
    return
  }
  const body = await resp.json()
  if ( !body.data ) {
    return
  }

  jhValue("#itemtypeeditdescription", body.data.description)
  jhValue("#itemtypeediticon", body.data.icon)
  jhQuery("#itemtypeeditdialog").show()
  itemTypeEditEnable()
}

function itemTypeEditEnable() {
  if ( jhValue("#itemtypeeditdescription")==="" ) {
    jhQuery("#itemtypeeditsave").setAttribute("disabled","disabled")
  } else {
    jhQuery("#itemtypeeditsave").removeAttribute("disabled")
  }
}

async function itemTypeEdit() {
  const data = {
    _csrf: PW.getCSRFToken(),
    description: jhValue("#itemtypeeditdescription"),
    icon: jhValue("#itemtypeediticon")
  }

  jhQuery("#itemtypeeditdialog").hide()
  const resp = await jhFetch(`/api/itemtypes/${currentItemType}`, data, "PATCH")
  if ( !await PW.checkResponse(resp) ) {
    return
  }

  PW.showToast("success", "Item type updated")
  await fillItemTypes()
}

jhEvent("#additemtype", "click", ()=>{
  itemTypeCreateDialog()
})
jhEvent("#itemtypenewcancel", "click", ()=>{
  jhQuery("#itemtypenewdialog").hide()
})
jhEvent("#itemtypenewdescription", "keyup", ()=>{
  itemTypeCreateEnable()
})
jhEvent("#itemtypenewsave", "click", async()=>{
  await itemTypeCreate()
})

jhEvent("#itemtypeeditcancel", "click", ()=>{
  jhQuery("#itemtypeeditdialog").hide()
})
jhEvent("#itemtypeeditsave", "click", async()=>{
  await itemTypeEdit()
})
jhEvent("#itemtypeeditdescription", "keyup", ()=>{
  itemTypeEditEnable()
})

