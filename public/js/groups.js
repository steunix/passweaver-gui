var currentGroup = ""

function fillUsers() {
  loadingShow($("#userstable"))

  $("#userstable tbody tr").remove()
  $.get("/api/userslist/"+currentGroup,(resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    if ( resp.data.length ) {
      var row = ''
      for ( const usr of resp.data ) {
        row += `<tr>`
        row += `<td><i id='remove-${usr.id}' title='Remove' data-id='${usr.id}' class='v-action fa-solid fa-trash text-danger'"></i></td>`
        row += `<td class='border-start'>${usr.login}</td>`
        row += `<td>${usr.lastname}</td>`
        row += `<td>${usr.firstname}</td>`
      }
      $("#userstable tbody").append(row)

      // Install event handlers
      $("#userstable tbody i[id^=remove]").on("click",(ev)=>{
        groupRemoveUser($(ev.currentTarget).data("id"))
      })
    }

    // Group cannot be removed if not empty
    if ( $("#userstable tbody tr").length ) {
      $("#removegroup").attr("disabled","disabled")
    } else {
      $("#removegroup").removeAttr("disabled")
    }

    loadingHide($("#userstable"))
  })
}

function groupClicked(ev) {
  $("[role=treeitem]").removeClass("v-treeselected")

  // If ev is a string, the call has been forced on an item just for items reload: calling an
  // "onclick" directly would mess with collapse status of the folder
  if ( typeof ev==="string" ) {
    $("[role=treeitem][id="+ev+"]").addClass("v-treeselected")
    ensureVisibile( $("[role=treeitem][id="+ev+"]") )
    currentGroup = ev
  } else {
    $(this).addClass("v-treeselected")
    currentGroup = this.id
  }

  localStorage.setItem(`bstreeview_open_groupstree_${ getUser() }`,currentGroup)

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

  $.post("/api/groupnew/"+currentGroup, userdata, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    if ( resp.data.id ) {
      location.reload()
    } else {
      errorDialog(resp.message)
    }
  });
}

function groupRemove() {
  confirm("Remove group", "Are you sure you want to remove this group?", ()=> {
    $.post("/api/groupremove/"+currentGroup, {_csrf: $("#_csrf").val()}, (resp)=> {
      if ( !checkResponse(resp) ) {
        return
      }

      location.reload()
    })
  })
}

function groupEditFill() {
  $("#groupeditid").val(currentGroup)

  $.get("/api/groups/"+currentGroup, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

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

  $.post("/api/groupupdate/"+$("#groupeditid").val(), data, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    location.reload()
  })
}

function groupEditEnable() {
  if ( $("#groupeditdescription").val()=="" ) {
    $("#groupedit").attr("disabled","disabled")
  } else {
    $("#groupedit").removeAttr("disabled")
  }
}

function userPickerChoosen(id) {
  $.post("/api/groupadduser/"+currentGroup+"/"+id, {_csrf: $("#_csrf").val()}, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    location.reload()
  })
}

function groupRemoveUser(id) {
  confirm("Remove user from group", "Are you sure you want to remove the user?", ()=> {
    $.post("/api/groupremoveuser/"+currentGroup+"/"+id, {_csrf: $("#_csrf").val()}, (resp)=> {
      if ( !checkResponse(resp) ) {
        return
      }

      location.reload()
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

$(()=>{
  $.get("/api/groupstree", (resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    $('#groupstree').bstreeview({ parentsMarginLeft: '1rem', indent: 1, data: resp.data })
    $('[role=treeitem]').on("mousedown", groupClicked)

    // Open last used group
    const last = localStorage.getItem(`bstreeview_open_groupstree_${ getUser() }`)
    if ( last ) {
      groupClicked(last)
    }
  })

  // Event handlers
  $("#removegroup").on("click", (ev)=>{
    groupRemove()
  })
  $("#groupedit").on("click", (ev)=>{
    groupEdit()
  })
  $("#groupcreate").on("click", (ev)=>{
    groupCreate()
  })
  $("#newgroupdescription").on("keyup", (ev)=>{
    groupCreateEnable()
  })
  $("#groupeditdescription").on("keyup", (ev)=>{
    groupEditEnable()
  })
})