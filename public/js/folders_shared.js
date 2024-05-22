var folderSearchTimeout

var currentPermissions = {
  read: false,
  write: false
}

function currentFolder() {
  try {
    return document.querySelector("sl-tree-item[selected]").getAttribute("data-id")
  } catch (err) {
    return ""
  }
}

function folderCreateDialog() {
  $("#foldercreatedialog sl-input,sl-textarea").val("")
  folderCreateEnable()
  document.querySelector("#foldercreatedialog").show()
}

function folderCreateEnable() {
  const descr = document.querySelector("#foldercreatedescription").value
  if ( descr==="" ) {
    document.querySelector("#foldercreatesave").setAttribute("disabled","disabled")
  } else {
    document.querySelector("#foldercreatesave").removeAttribute("disabled")
  }
}

function folderCreate() {
  let itemdata = {
    _csrf: getCSRFToken(),
    description: document.querySelector("#foldercreatedescription").value
  }

  $.post(`/api/foldernew/${currentFolder()}`, itemdata, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    showToast("success", "Folder created")
    document.querySelector("#foldercreatedialog").hide()
    fillFolders()
  })
}

function folderRemove() {
  confirmDialog("Remove folder", "Are you sure you want to remove this folder?", ()=> {
    $.post(`/api/folderremove/${currentFolder()}`, {_csrf: getCSRFToken()}, (resp)=> {
      if ( !checkResponse(resp) ) {
        return
      }

      showToast("success", "Folder removed")
      document.querySelector("#foldercreatedialog").hide()
      fillFolders()
    })
  })
}

function folderEditDialog() {
  document.querySelector("#foldereditdialog").show()
  folderEditFill()
}

function folderEditEnable() {
  const descr = document.querySelector("#foldereditdescription").value
  if ( descr==="" ) {
    document.querySelector("#foldereditsave").setAttribute("disabled","disabled")
  } else {
    document.querySelector("#foldereditsave").removeAttribute("disabled")
  }
}

function folderEditFill() {
  $.get(`/api/folders/${currentFolder()}`, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    document.querySelector("#foldereditdescription").value = resp.data.description
    folderEditEnable()
  })
}

function folderEdit() {
  let data = {
    _csrf: getCSRFToken(),
    description: document.querySelector("#foldereditdescription").value
  }

  $.post(`/api/folderupdate/${currentFolder()}`, data, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    showToast("success", "Folder updated")
    document.querySelector("#foldereditdialog").hide()
    fillFolders()
  })
}


// Event handlers
document.querySelector("#foldercreatedescription").addEventListener("keyup",(ev)=>{
  folderCreateEnable()
})

document.querySelector("#folderremove").addEventListener("click", (ev)=>{
  folderRemove()
})

document.querySelector("#folderedit").addEventListener("click", (ev)=>{
  folderEditDialog()
})
document.querySelector("#foldercreate").addEventListener("click", (ev)=>{
  if ( currentFolder()==="" ) {
    errorDialog("Select a parent folder")
    return
  }
  folderCreateDialog()
})

document.querySelector("#foldercreatesave").addEventListener("click", (ev)=>{
  folderCreate()
})
document.querySelector("#foldercreatecancel").addEventListener("click", (ev)=> {
  document.querySelector("#foldercreatedialog").hide()
})

document.querySelector("#foldereditdescription").addEventListener("keyup",(ev)=>{
  folderEditEnable()
})
document.querySelector("#foldereditcancel").addEventListener("click", (ev)=> {
  document.querySelector("#foldereditdialog").hide()
})
document.querySelector("#foldereditsave").addEventListener("click", (ev)=>{
  folderEdit()
})

document.querySelector("#foldersearch").addEventListener("sl-input", (ev)=> {
  if ( folderSearchTimeout ) {
    clearTimeout(folderSearchTimeout)
  }
  folderSearchTimeout = setTimeout(()=>{
    const search = document.querySelector("#foldersearch").value
    if ( !treeSearch("folderstree", search) ) {
      showToast("danger", "Not found")
    }
  },250)
})

document.querySelector("#foldersearchnext").addEventListener("click", (ev)=>{
  const search = document.querySelector("#foldersearch").value
  treeSearchNext("folderstree", search)
})
document.querySelector("#foldersearchprevious").addEventListener("click", (ev)=>{
  const search = document.querySelector("#foldersearch").value
  treeSearchPrevious("folderstree", search)
})