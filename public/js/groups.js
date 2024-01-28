var currentGroup = ""

function fillUsers() {
  loadingShow($("#userstable"))
  $.get("/pages/userslist/"+currentGroup,(resp)=>{
    $("#userstable tbody tr").remove()
    if ( resp.data.length ) {
      for ( const usr of resp.data ) {
        var row = `<tr>`
        row += `<td><i class='fa-solid fa-trash text-danger' onclick="javascript:groupRemoveUser('${usr.id}')"></i></td>`
        row += `<td>${usr.login}</td>`
        row += `<td>${usr.lastname}</td>`
        row += `<td>${usr.firstname}</td>`
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
    _csrf: $("#_csrf").val(),
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
  confirm("Remove group", "Are you sure you want to remove this group?", ()=> {
    $.post("/pages/groupremove/"+currentGroup, {_csrf: $("#_csrf").val()}, (resp)=> {
      if ( resp.status=="success" ) {
        location.reload()
      } else {
        // TODO: handle error
      }
    })
  })
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
    _csrf: $("#_csrf").val(),
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
  $.post("/pages/groupadduser/"+currentGroup+"/"+id, {_csrf: $("#_csrf").val()}, (resp)=> {
    if ( resp.status=="success" ) {
      location.reload()
    } else {
      // TODO: handle error
    }
  })
}

function groupRemoveUser(id) {
  confirm("Remove user from group", "Are you sure you want to remove the user?", ()=> {
    $.post("/pages/groupremoveuser/"+currentGroup+"/"+id, {_csrf: $("#_csrf").val()}, (resp)=> {
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

  // Autofocus
  $("#newgroupdialog,#editgroupdialog,#userpicker").on("shown.bs.modal", (ev)=> {
    $(this).find("[autofocus]").focus()
  })
})