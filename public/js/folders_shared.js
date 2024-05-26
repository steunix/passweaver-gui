var folderSearchTimeout

const refresh = new Event("folders-refresh")

export var currentPermissions = {
  read: false,
  write: false
}

export function currentFolder() {
  try {
    return jhQuery("sl-tree-item[selected]").getAttribute("data-id")
  } catch (err) {
    return ""
  }
}

function folderCreateDialog() {
  jhValue("#foldercreatedialog sl-input,sl-textarea")
  folderCreateEnable()
  jhQuery("#foldercreatedialog").show()
}

function folderCreateEnable() {
  const descr = jhValue("#foldercreatedescription")
  if ( descr==="" ) {
    jhQuery("#foldercreatesave").setAttribute("disabled","disabled")
  } else {
    jhQuery("#foldercreatesave").removeAttribute("disabled")
  }
}

async function folderCreate() {
  let itemdata = {
    _csrf: getCSRFToken(),
    description: jhValue("#foldercreatedescription")
  }

  jhQuery("#foldercreatedialog").hide()
  const resp = await jhFetch(`/api/foldernew/${currentFolder()}`, itemdata)
  if ( !await checkResponse(resp) ) {
    return
  }

  showToast("success", "Folder created")
  dispatchEvent(refresh)
}

async function folderRemove() {
  confirmDialog("Remove folder", "Are you sure you want to remove this folder?", async ()=> {
    jhQuery("#foldercreatedialog").hide()
    const resp = await jhFetch(`/api/folderremove/${currentFolder()}`, {_csrf: getCSRFToken()})
    if ( !await checkResponse(resp) ) {
      return
    }

    showToast("success", "Folder removed")
    dispatchEvent(refresh)
  })
}

function folderEditDialog() {
  jhQuery("#foldereditdialog").show()
  folderEditFill()
}

function folderEditEnable() {
  const descr = jhValue("#foldereditdescription")
  if ( descr==="" ) {
    jhQuery("#foldereditsave").setAttribute("disabled","disabled")
  } else {
    jhQuery("#foldereditsave").removeAttribute("disabled")
  }
}

async function folderEditFill() {
  const resp = await jhFetch(`/api/folders/${currentFolder()}`)
  if ( !await checkResponse(resp) ) {
    return
  }

  const body = await resp.json()
  jhValue("#foldereditdescription", body.data.description)
  folderEditEnable()
}

async function folderEdit() {
  let data = {
    _csrf: getCSRFToken(),
    description: jhValue("#foldereditdescription")
  }

  jhQuery("#foldereditdialog").hide()
  const resp = await jhFetch(`/api/folderupdate/${currentFolder()}`, data)
  if ( !await checkResponse(resp) ) {
    return
  }

  showToast("success", "Folder updated")
  dispatchEvent(refresh)
}


// Event handlers
jhEvent("#foldercreatedescription", "keyup",(ev)=>{
  folderCreateEnable()
})

jhEvent("#folderremove", "click", (ev)=>{
  folderRemove()
})

jhEvent("#folderedit", "click", (ev)=>{
  folderEditDialog()
})
jhEvent("#foldercreate", "click", (ev)=>{
  if ( currentFolder()==="" ) {
    errorDialog("Select a parent folder")
    return
  }
  folderCreateDialog()
})

jhEvent("#foldercreatesave", "click", (ev)=>{
  folderCreate()
})
jhEvent("#foldercreatecancel", "click", (ev)=> {
  jhQuery("#foldercreatedialog").hide()
})

jhEvent("#foldereditdescription", "keyup",(ev)=>{
  folderEditEnable()
})
jhEvent("#foldereditcancel", "click", (ev)=> {
  jhQuery("#foldereditdialog").hide()
})
jhEvent("#foldereditsave", "click", (ev)=>{
  folderEdit()
})

jhEvent("#foldersearch", "sl-input", (ev)=> {
  if ( folderSearchTimeout ) {
    clearTimeout(folderSearchTimeout)
  }
  folderSearchTimeout = setTimeout(()=>{
    const search = jhValue("#foldersearch")
    if ( !treeSearch("folderstree", search) ) {
      showToast("danger", "Not found")
    }
  },250)
})

jhEvent("#foldersearchnext", "click", (ev)=>{
  const search = jhValue("#foldersearch")
  treeSearchNext("folderstree", search)
})
jhEvent("#foldersearchprevious", "click", (ev)=>{
  const search = jhValue("#foldersearch")
  treeSearchPrevious("folderstree", search)
})