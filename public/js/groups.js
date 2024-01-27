var currentGroup = ""

function fillUsers() {
  loadingShow($("#userstable"))
  $.get("/pages/userslist/"+currentGroup,(resp)=>{
    $("#userstable tbody tr").remove()
    if ( resp.data.length ) {
      for ( const itm of resp.data ) {
        var row = `<tr>`
        row += `<td><i class='fa-solid fa-trash text-danger' onclick="javascript:groupRemoveUser('${itm.id}')"></i></td>`
        row += `<td>${itm.login}</td>`
        row += `<td>${itm.lastname}</td>`
        row += `<td>${itm.firstname}</td>`
        $("#userstable tbody").append(row)
      }
    }

    // group cannot be removed if not empty
    if ( $("#userstable tbody tr").length ) {
      $("#removegroup").attr("disabled","disabled")
    } else {
      $("#removegroup").removeAttr("disabled")
    }

    loadingHide($("#userstable"))
  })
}

function groupClicked(ev) {
  $("[role=treeitem]").css({"font-weight":"normal","background-color":"transparent"})

  // If ev is a string, the call has been forced on an item just for items reload: calling an
  // "onclick" directly would mess with collapse status of the folder
  if ( typeof ev==="string" ) {
    $("[role=treeitem][id="+ev+"]").css("font-weight","bold").css("background-color","#eeeeee")
    currentGroup = ev
  } else {
    $(this).css("font-weight","bold").css("background-color","#eeeeee")
    currentGroup = this.id
  }

  localStorage.setItem("bstreeview_open_groupstree",currentGroup)

  // Read group members
  fillUsers()
}

function groupCreateEnable() {
  if ( $("#newgroupdescription").val()=="" ) {
    $("#groupcreate").attr("disabled","disabled")
  } else {
    $("#groupcreate").removeAttr("disabled")
  }
}

function groupCreate() {
  let userdata = {
    description: $("#newgroupdescription").val()
  }

  $.post("/pages/groupnew/"+currentGroup, userdata, (resp)=> {
    if ( resp.data && resp.data.id ) {
      location.reload()
    } else {
      // TODO: handle error
    }
  });
}

function groupRemove() {
  $.post("/pages/groupremove/"+$("#groupremoveid").val(), (resp)=> {
    if ( resp.status=="success" ) {
      location.reload()
    } else {
      // TODO: handle error
    }
  });
}

function groupEditFill() {
  $("#groupeditid").val(currentGroup)

  $.get("/pages/groups/"+currentGroup, (resp)=> {
    if ( resp.status=="success" ) {
      $("#groupeditdescription").val(resp.data.description)
    }
  })
}

function groupEdit() {
  let data = {
    description: $("#groupeditdescription").val()
  }

  $.post("/pages/groupupdate/"+$("#groupeditid").val(), data, (resp)=> {
    if ( resp.status=="success" ) {
      location.reload()
    } else {
      // TODO: handle error
    }
  });
}

function groupEditEnable() {
  if ( $("#groupeditdescription").val()=="" ) {
    $("#groupedit").attr("disabled","disabled")
  } else {
    $("#groupedit").removeAttr("disabled")
  }
}

function userPickerChoosen(id) {
  $.post("/pages/groupadduser/"+currentGroup+"/"+id, (resp)=> {
    if ( resp.status=="success" ) {
      location.reload()
    } else {
      // TODO: handle error
    }
  })
}

function groupRemoveUser(id) {
  confirm("Remove user from group", "Are you sure you want to remove the user?", ()=> {
    $.post("/pages/groupremoveuser/"+currentGroup+"/"+id, (resp)=> {
      if ( resp.status=="success" ) {
        location.reload()
      } else {
        // TODO: handle error
      }
    })
  })
}

$(function() {
  // Reset add user dialog fields
  $("#adduserdialog").on("hidden.bs.modal", ()=> {
    $("#adduserdialog input,textarea,select").val("")
  })

  // Get the user data to be edited
  $("#editgroupdialog").on("show.bs.modal", (ev)=> {
    groupEditFill($(ev.relatedTarget).data("id"))
  })

  // Reset new group dialog fields
  $("#newgroupdialog").on("hidden.bs.modal", ()=> {
    $("#newgroupdialog input,textarea,select").val("")
  })

  // Sets the value for group to be deleted
  $("#removegroupdialog").on("show.bs.modal", (ev)=> {
    $("#groupremoveid").val(currentGroup)
  })

  // Autofocus
  $("#newgroupdialog,#editgroupdialog,#userpicker").on("shown.bs.modal", (ev)=> {
    $(this).find("[autofocus]").focus()
  })
})