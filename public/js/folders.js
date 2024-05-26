import * as Folders from './folders_shared.js'

async function fillGroups() {
  jhQuery("#groupstable tbody").innerHTML = ""
  if ( !Folders.currentFolder() ) {
    return
  }

  const resp = await jhFetch(`/api/foldergroups/${Folders.currentFolder()}`)
  if ( !await checkResponse(resp) ) {
    return
  }

  const body = await resp.json()
  if ( body.data.length ) {
    var row = "<tr>"
    for ( const itm of body.data ) {
      if ( itm.inherited ) {
        row += "<td colspan='2'>Inherited</td>"
      } else {
        if ( itm.canmodify ) {
          row += `<td><sl-icon-button id='removegroup-${itm.id}' data-id='${itm.id}' name='trash3' title='Remove' style='color:red;'></sl-icon-button></td>`
          row += `<td><sl-icon-button id='togglegroup-${itm.id}' data-id='${itm.id}' name='arrow-left-right' title='Change permissions'></sl-icon-button></td>`
        } else {
          row += "<td></td><td></td>"
        }
      }
      row += "<td class='border-start border-end'>"+(itm.write ? "Read + write" : "Read only")+"</td>"
      row += `<td>${itm.description}</td></tr>`

      // Check if groups can be added
      if ( !itm.canmodify ) {
        jhQuery("#addgroup").setAttribute("disabled","disabled")
      } else {
        jhQuery("#addgroup").removeAttribute("disabled")
      }
    }
    jhQuery("#groupstable tbody").innerHTML = row

    // Event handlers
    jhEvent("[id^=removegroup]", "click", groupRemove)
    jhEvent("[id^=togglegroup]", "click", groupToggle)
  }
}

async function folderClicked(folderid) {
  const resp = await jhFetch(`/api/folders/${folderid}`)

  // Folder may not be accessible
  if ( !await checkResponse(resp,"403") ) {
    return
  }

  const body = await resp.json()
  if ( body.data && body.data.permissions ) {
    Folders.currentPermissions.write = body.data.permissions.write
    Folders.currentPermissions.read  = body.data.permissions.read
  } else {
    Folders.currentPermissions.write = true
    Folders.currentPermissions.read  = true
  }

  if ( Folders.currentPermissions.write ) {
    jhQuery("#foldercreate").removeAttribute("disabled")
    jhQuery("#folderremove").removeAttribute("disabled")
    jhQuery("#folderedit").removeAttribute("disabled")
  } else {
    jhQuery("#foldercreate").setAttribute("disabled","disabled")
    jhQuery("#folderremove").setAttribute("disabled","disabled")
    jhQuery("#folderedit").setAttribute("disabled","disabled")
  }

  // Load groups
  await fillGroups()
}

async function groupRemove(ev) {
  const group = ev.currentTarget.getAttribute("data-id")
  confirmDialog("Remove group", "Are you sure you want to remove the group?", async ()=>{
    const resp = await jhFetch(`/api/folders/${Folders.currentFolder()}/groups/${group}`, { _csrf: getCSRFToken() }, "DELETE")
    if ( !await checkResponse(resp) ) {
      return
    }

    await fillGroups()
    showToast("success", "Group removed")
  })
}

async function groupToggle(ev) {
  const group = ev.currentTarget.getAttribute("data-id")
  const resp = await jhFetch(`/api/folders/${Folders.currentFolder()}/groups/${group}/toggle`, { _csrf: getCSRFToken() })
  if ( !await checkResponse(resp) ) {
    return
  }

  await fillGroups()
  showToast("success", "Group permissions changed")
}

async function groupPickerChoosen(group) {
  const resp = await jhFetch(`/api/folders/${Folders.currentFolder()}/groups/${group}`, { _csrf: getCSRFToken() })
  if ( !await checkResponse(resp) ) {
    return
  }

  groupPickerHide()
  await fillGroups()
  showToast("success", "Group added")
}

async function fillFolders() {
  const resp = await jhFetch("/api/folderstree")
    if ( !await checkResponse(resp) ) {
      return
    }

    const body = await resp.json()
    jhQuery("sl-tree").innerHTML = ""
    treeFill("folderstree",body.data,null,folderClicked)
}

await fillFolders()

jhEvent("#addgroup", "click",(ev)=>{
  groupPickerShow(groupPickerChoosen)
})
addEventListener("folders-refresh", async (ev)=>{
  await fillFolders()
})