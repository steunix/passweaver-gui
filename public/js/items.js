var currentFolder = ""
var currentPermissions = {
  read: false,
  write: false
}

function fillItems() {
  $.get("/pages/itemslist/"+currentFolder,(resp)=>{
    $("#itemstable tr[id!=tableheader]").remove()
    if ( resp.data.length ) {
      for ( const itm of resp.data ) {
        var row = "<tr>"
        if ( currentPermissions.write ) {
          row += `<td><i class='fa-solid fa-trash text-danger' data-bs-toggle="modal" data-bs-target="#removeitemdialog" data-id='${itm.id}'></i></td>`
          row += `<td><i class='fa-solid fa-pen-to-square' data-bs-toggle="modal" data-bs-target="#edititemdialog" data-id='${itm.id}'></i></td>`
        } else {
          row += "<td></td><td></td>"
        }
        row += "<td>"+itm.title+"</td><td>"+itm.createdat+"</td></tr>"
        $("#itemstable tbody").append(row)
      }
    }

    // Folder cannot be removed if not empty
    if ( $("#itemstable tbody tr").length ) {
      $("#removefolder").attr("disabled","disabled")
    }
  })
}

function folderClicked(ev) {
  $("[role=treeitem]").css({"font-weight":"normal","background-color":"transparent"})
  $(this).css("font-weight","bold").css("background-color","#eeeeee")
  currentFolder = this.id

  localStorage.setItem("bstreeview_open_folderstree",currentFolder)

  // Read folder info
  $.get("/pages/folders/"+currentFolder,(resp)=>{
    if ( resp.data && resp.data.permissions ) {
      currentPermissions = resp.data.permissions
    } else {
      currentPermissions = { read: false, write: false }
    }

    if ( currentPermissions.write ) {
      $("#newitem").removeAttr("disabled")
      $("#newfolder").removeAttr("disabled")
      $("#removefolder").removeAttr("disabled")
      $("#editfolder").removeAttr("disabled")
    } else {
      $("#newitem").attr("disabled","disabled")
      $("#newfolder").attr("disabled","disabled")
      $("#removefolder").attr("disabled","disabled")
      $("#editfolder").attr("disabled","disabled")
    }

    fillItems()
  })
}

function toggleNewPassword() {
  if ( $("#newpassword").attr("type")=="password") {
    $("#newpassword").attr("type","text")
  } else {
    $("#newpassword").attr("type","password")
  }
}

function itemCreate() {
  let itemdata = {
    title: $("#newtitle").val(),
    description: $("#newdescription").val(),
    url: $("#newurl").val(),
    user: $("#newuser").val(),
    password: $("#newpassword").val()
  }

  $.post("/pages/itemnew/"+currentFolder, itemdata, (resp)=> {
    if ( resp.data && resp.data.id ) {
      location.reload()
    } else {
      // TODO: handle error
    }
  });
}

function itemCreateEnable() {
  if ( $("#newtitle").val()=="" ) {
    $("#itemcreate").attr("disabled","disabled")
  } else {
    $("#itemcreate").removeAttr("disabled")
  }
}

function itemRemove() {
  $.post("/pages/itemremove/"+$("#itemremoveid").val(), (resp)=> {
    if ( resp.status=="success" ) {
      location.reload()
    } else {
      // TODO: handle error
    }
  });
}

function itemEditFill(item) {
  $("#itemeditid").val(item)

  $.get("/pages/items/"+item, (resp)=> {
    if ( resp.status=="success" ) {
      $("#edittitle").val(resp.data.title)
      $("#editdescription").val(resp.data.data.description)
      $("#editurl").val(resp.data.data.url)
      $("#edituser").val(resp.data.data.user)
      $("#editpassword").val(resp.data.data.password)
    }
  })
}

function itemEditEnable() {
  if ( $("#edittitle").val()=="" ) {
    $("#itemedit").attr("disabled","disabled")
  } else {
    $("#itemedit").removeAttr("disabled")
  }
}

function itemEdit() {
  let itemdata = {
    title: $("#edittitle").val(),
    data: {
      description: $("#editdescription").val(),
      url: $("#editurl").val(),
      user: $("#edituser").val(),
      password: $("#editpassword").val()
    }
  }

  $.post("/pages/itemupdate/"+$("#itemeditid").val(), itemdata, (resp)=> {
    if ( resp.status=="success" ) {
      location.reload()
    } else {
      // TODO: handle error
    }
  });
}

function toggleEditPassword() {
  if ( $("#editpassword").attr("type")=="password") {
    $("#editpassword").attr("type","text")
  } else {
    $("#editpassword").attr("type","password")
  }
}

function folderCreateEnable() {
  if ( $("#newfolderdescription").val()=="" ) {
    $("#foldercreate").attr("disabled","disabled")
  } else {
    $("#foldercreate").removeAttr("disabled")
  }
}

function folderCreate() {
  let itemdata = {
    description: $("#newfolderdescription").val()
  }

  $.post("/pages/foldernew/"+currentFolder, itemdata, (resp)=> {
    if ( resp.data && resp.data.id ) {
      location.reload()
    } else {
      // TODO: handle error
    }
  });
}

function folderRemove() {
  $.post("/pages/folderremove/"+$("#folderremoveid").val(), (resp)=> {
    if ( resp.status=="success" ) {
      location.reload()
    } else {
      // TODO: handle error
    }
  });
}

function folderEditEnable() {
  if ( $("#foldereditdescription").val()=="" ) {
    $("#folderedit").attr("disabled","disabled")
  } else {
    $("#folderedit").removeAttr("disabled")
  }
}

function folderEditFill() {
  $("#foldereditid").val(currentFolder)

  $.get("/pages/folders/"+currentFolder, (resp)=> {
    if ( resp.status=="success" ) {
      $("#foldereditdescription").val(resp.data.description)
    }
  })
}

function folderEdit() {
  let data = {
    description: $("#foldereditdescription").val()
  }

  $.post("/pages/folderupdate/"+$("#foldereditid").val(), data, (resp)=> {
    if ( resp.status=="success" ) {
      location.reload()
    } else {
      // TODO: handle error
    }
  });
}

$(function() {
  // Reset new item dialog fields
  $("#newitemdialog").on("hidden.bs.modal", ()=> {
    $("#newitemdialog input,textarea").val("")
  })

  // Sets the value for item to be deleted
  $("#removeitemdialog").on("show.bs.modal", (ev)=> {
    $("#itemremoveid").val($(ev.relatedTarget).data("id"))
  })

  // Get the item data to be edited
  $("#edititemdialog").on("show.bs.modal", (ev)=> {
    itemEditFill($(ev.relatedTarget).data("id"))
  })

  // Reset new folder dialog fields
  $("#newfolderdialog").on("hidden.bs.modal", ()=> {
    $("#newfolderdialog input,textarea").val("")
  })

  // Sets the value for folder to be deleted
  $("#removefolderdialog").on("show.bs.modal", (ev)=> {
    $("#folderremoveid").val(currentFolder)
  })

  // Autofocus
  $("#newitemdialog,#edititemdialog,#newfolderdialog").on("shown.bs.modal", (ev)=> {
    $(this).find("[autofocus]").focus()
  })

  // Get the folder data to be edited
  $("#editfolderdialog").on("show.bs.modal", (ev)=> {
    folderEditFill($(ev.relatedTarget).data("id"))
  })
})