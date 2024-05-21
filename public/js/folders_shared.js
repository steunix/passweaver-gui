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
  const dialog = document.querySelector("#foldercreatedialog")
  $("#foldercreatedialog sl-input,sl-textarea").val("")
  folderCreateEnable()
  dialog.show()
}

function folderCreateEnable() {
  if ( $("#foldercreatedescription").val()=="" ) {
    $("#foldercreatesave").attr("disabled","disabled")
  } else {
    $("#foldercreatesave").removeAttr("disabled")
  }
}

function folderCreate() {
  let itemdata = {
    _csrf: $("#_csrf").val(),
    description: $("#foldercreatedescription").val()
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
    $.post(`/api/folderremove/${currentFolder()}`, {_csrf: $("#_csrf").val()}, (resp)=> {
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
  if ( $("#foldereditdescription").val()=="" ) {
    $("#foldereditsave").attr("disabled","disabled")
  } else {
    $("#foldereditsave").removeAttr("disabled")
  }
}

function folderEditFill() {
  $.get(`/api/folders/${currentFolder()}`, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    $("#foldereditdescription").val(resp.data.description)
    folderEditEnable()
  })
}

function folderEdit() {
  let data = {
    _csrf: $("#_csrf").val(),
    description: $("#foldereditdescription").val()
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

function fillFolders() {
  $.get("/api/folderstree", (resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    $("sl-tree-item").remove()
    treeFill("folderstree",resp.data,null,folderClicked)
  })
}

$(function() {
  // Event handlers
  $("#foldercreatedescription").on("keyup",(ev)=>{
    folderCreateEnable()
  })

  $("#folderremove").on("click", (ev)=>{
    folderRemove()
  })
  $("#folderedit").on("click", (ev)=>{
    folderEditDialog()
  })
  $("#foldercreate").on("click", (ev)=>{
    if ( currentFolder()==="" ) {
      errorDialog("Select a parent folder")
      return
    }
    folderCreateDialog()
  })

  $("#foldercreatesave").on("click", (ev)=>{
    folderCreate()
  })
  $("#foldercreatecancel").on("click", (ev)=> {
    document.querySelector("#foldercreatedialog").hide()
  })

  $("#foldereditdescription").on("keyup",(ev)=>{
    folderEditEnable()
  })
  $("#foldereditcancel").on("click", (ev)=> {
    document.querySelector("#foldereditdialog").hide()
  })
  $("#foldereditsave").on("click", (ev)=>{
    folderEdit()
  })

  $("#foldersearch").on("sl-input", (ev)=> {
    if ( folderSearchTimeout ) {
      clearTimeout(folderSearchTimeout)
    }
    folderSearchTimeout = setTimeout(()=>{
      const search = document.querySelector("#foldersearch").value
      treeSearch("folderstree", search)
    },250)
  })

  $("#foldersearchnext").on("click", (ev)=>{
    const search = document.querySelector("#foldersearch").value
    treeSearchNext("folderstree", search)
  })
  $("#foldersearchprevious").on("click", (ev)=>{
    const search = document.querySelector("#foldersearch").value
    treeSearchPrevious("folderstree", search)
  })
})