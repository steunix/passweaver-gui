var userSearchTimeout
var currentUser

function fillUsers() {
  $.get("/api/userslist?search="+$("#usersearch").val(),(resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    $("#userstable tbody tr").remove()
    if ( resp.data.length ) {
      var row = ""
      for ( const itm of resp.data ) {
        row += `<tr data-id='${itm.id}' style='cursor:pointer'>`
        row += `<td><i id='edit-${itm.id}' title='Edit' class='v-action fa-solid fa-pen-to-square' data-bs-toggle="modal" data-bs-target="#edituserdialog" data-id='${itm.id}'></i></td>`
        row += `<td><i id='remove-${itm.id}' title='Remove' class='v-action fa-solid fa-trash text-danger' data-id='${itm.id}'></i></td>`
        row += `<td class='border-start'>${itm.login}</td>`
        row += `<td>${itm.lastname}</td>`
        row += `<td>${itm.firstname}</td>`
        row += `<td>${itm.email}</td>`
        row += `<td>${itm.locale}</td>`
        row += `<td>${itm.authmethod}</td>`
        row += `<td class='text-center'><i class='fa-solid `+ (itm.active ? "fa-check text-success" : "fa-xmark text-danger") + `'/></td>`
        row += "</tr>"
      }
      $("#userstable tbody").append(row)

      // Install event handlers
      $("#userstable tbody tr").on("dblclick",(ev)=>{
        userDoubleClicked($(ev.currentTarget).data("id"))
      })
      $("#userstable tbody tr i[id^=remove]").on("click",(ev)=>{
        userRemove($(ev.currentTarget).data("id"))
      })
      $("#userstable tbody tr").on("click",(ev)=>{
        currentUser = $(ev.currentTarget).data("id")
        $(ev.currentTarget).addClass("v-rowselected").siblings().removeClass("v-rowselected")
        fillGroups()
      })
    }
  })
}

function fillGroups() {
  loadingShow($("#groupstable"))

  $("#groupstable tbody tr").remove()
  $.get("/api/usergroups/"+currentUser,(resp)=>{
    if ( !checkResponse(resp) ) {
      return
    }

    if ( resp.data.length ) {
      var row = "<tr>"
      for ( const itm of resp.data ) {
        row += `<td><i id='removegroup-${itm.id}' data-id='${itm.id}' class='v-action fa-solid fa-trash text-danger' title='Remove'></i></td>`
        row += `<td>${itm.description}</td></tr>`
      }
      $("#groupstable tbody").append(row)

      // Event handlers
      $("i[id^=removegroup]").on("click", groupRemove)
    }
    loadingHide($("#groupstable"))
  })
}

function toggleNewPassword() {
  if ( $("#newpassword").attr("type")=="password") {
    $("#newpassword").attr("type","text")
  } else {
    $("#newpassword").attr("type","password")
  }
}

function toggleNewPasswordConfirm() {
  if ( $("#newpasswordconfirm").attr("type")=="password") {
    $("#newpasswordconfirm").attr("type","text")
  } else {
    $("#newpasswordconfirm").attr("type","password")
  }
}

function userCreate() {
  let userdata = {
    _csrf: $("#_csrf").val(),
    login: $("#newlogin").val(),
    email: $("#newemail").val(),
    lastname: $("#newlastname").val(),
    firstname: $("#newfirstname").val(),
    locale: $("#newlocale").val(),
    authmethod: $("#newauthmethod").val(),
    active: $("#newactive").is(":checked"),
    secret: $("#newpassword").val()
  }

  $.post("/api/usernew/", userdata, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    location.reload()
  })
}

function userCreateEnable() {
  if (
    $("#newlogin").val()=="" || $("#newemail").val()=="" || $("#newlastname").val()=="" ||
    $("#newpassword").val()!=$("#newpasswordconfirm").val() || $("#newpassword").val()=="" ) {
      $("#usercreate").attr("disabled","disabled")
  } else {
    $("#usercreate").removeAttr("disabled")
  }
}

function userRemove(usr) {
  confirm("Remove user", "<strong><span class='text-danger'>Are you sure you want to delete this user? Also his personal folder and contained items will be deleted!</span></strong>", ()=> {
    $.post("/api/userremove/"+usr, {_csrf: $("#_csrf").val()}, (resp)=> {
      if ( !checkResponse(resp) ) {
        return
      }

      location.reload()
    })
  })
}

function userEditFill(user) {
  $("#usereditid").val(user)

  $.get("/api/users/"+user, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    $("#editlogin").val(resp.data.login)
    $("#editemail").val(resp.data.email)
    $("#editlastname").val(resp.data.lastname)
    $("#editfirstname").val(resp.data.firstname)
    $("#editlocale").val(resp.data.locale)
    $("#editauthmethod").val(resp.data.authmethod)
    if ( !resp.data.active ) {
      $("#editactive").removeAttr("checked")
    }
  })
}

function userEditEnable() {
  if ( $("#editlogin").val()=="" || $("#editemail").val()=="" || $("#editlastname").val()=="" ) {
      $("#useredit").attr("disabled","disabled")
  } else {
    $("#useredit").removeAttr("disabled")
  }
}

function userEdit() {
  let userdata = {
    _csrf: $("#_csrf").val(),
    login: $("#editlogin").val(),
    email: $("#editemail").val(),
    lastname: $("#editlastname").val(),
    firstname: $("#editfirstname").val(),
    locale: $("#editlocale").val(),
    authmethod: $("#editauthmethod").val(),
    active: $("#editactive").is(":checked")
  }

  $.post("/api/userupdate/"+$("#usereditid").val(), userdata, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    location.reload()
  })
}

function toggleEditPassword() {
  if ( $("#editpassword").attr("type")=="password") {
    $("#editpassword").attr("type","text")
  } else {
    $("#editpassword").attr("type","password")
  }
}

function toggleViewPassword() {
  if ( $("#viewpassword").attr("type")=="password") {
    $("#viewpassword").attr("type","text")
  } else {
    $("#viewpassword").attr("type","password")
  }
}

function userDoubleClicked(user) {
  if ( window.getSelection() ) {
    window.getSelection().empty()
  }
  $("#edit-"+user).click()
}

$(function() {
  // Reset new user dialog fields
  $("#newuserdialog").on("hidden.bs.modal", ()=> {
    $("#newuserdialog input,textarea").val("")
  })

  // Get the user data to be edited
  $("#edituserdialog").on("show.bs.modal", (ev)=> {
    userEditFill($(ev.relatedTarget).data("id"))
  })

  // Autofocus
  $("#newuserdialog,#edituserdialog").on("shown.bs.modal", (ev)=> {
    $(this).find("[autofocus]").focus()
  })
})

function groupRemove(ev) {
  const group = $(ev.currentTarget).data("id")
  confirm("Remove user from group", "Are you sure you want to remove the user from the group?", ()=> {
    $.post(`/api/groupremoveuser/${group}/${currentUser}`, {_csrf: $("#_csrf").val()}, (resp)=> {
      if ( !checkResponse(resp) ) {
        return
      }

      fillGroups()
    })
  })
}

function groupPickerChoosen(group) {
  $.post(`/api/groupadduser/${group}/${currentUser}`, {_csrf: $("#_csrf").val()}, (resp)=> {
    if ( !checkResponse(resp) ) {
      return
    }

    groupPickerHide()
    fillGroups()
  })
}

$(()=>{
  fillUsers()

  // Event handlers
  $("#newlogin,#newemail,#newlastname,#newpassword,#newpasswordconfirm").on("keyup",(ev)=>{
    userCreateEnable()
  })
  $("#togglenewpassword").on("click",(ev)=>{
    toggleNewPassword()
  })
  $("#togglenewpasswordconfirm").on("click",(ev)=>{
    toggleNewPasswordConfirm()
  })
  $("#usercreate").on("click",(ev)=>{
    userCreate()
  })
  $("#editlogin,#editemail,#editlastname").on("keyup",(ev)=>{
    userEditEnable()
  })
  $("#useredit").on("click",(ev)=>{
    userEdit()
  })

  $("#usersearch").on("keyup", (ev) => {
    if ( userSearchTimeout ) {
      clearTimeout(userSearchTimeout)
    }
    userSearchTimeout = setTimeout(fillUsers,250)
  })
})