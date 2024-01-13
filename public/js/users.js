function fillUsers() {
  $.get("/pages/userslist",(resp)=>{
    $("#userstable tr[id!=tableheader]").remove()
    if ( resp.data.length ) {
      for ( const itm of resp.data ) {
        var row = `<tr ondblclick="javascript:userDoubleClicked('${itm.id}')">`
        row += `<td><i id='edit-${itm.id}' class='fa-solid fa-pen-to-square' data-bs-toggle="modal" data-bs-target="#edituserdialog" data-id='${itm.id}'></i></td>`
        row += `<td><i class='fa-solid fa-trash text-danger' data-bs-toggle="modal" data-bs-target="#removeuserdialog" data-id='${itm.id}'></i></td>`
        row += `<td>${itm.login}</td>`
        row += `<td>${itm.lastname}</td>`
        row += `<td>${itm.firstname}</td>`
        row += `<td>${itm.email}</td>`
        row += `<td>${itm.locale}</td>`
        row += `<td>${itm.authmethod}</td>`
        row += `<td class='text-center'><i class='fa-solid `+ (itm.active ? "fa-check text-success" : "fa-xmark text-danger") + `'/></td>`
        row += "</tr>"
        $("#userstable tbody").append(row)
      }
    }
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
    login: $("#newlogin").val(),
    email: $("#newemail").val(),
    lastname: $("#newlastname").val(),
    firstname: $("#newfirstname").val(),
    locale: $("#newlocale").val(),
    authmethod: $("#newauthmethod").val(),
    active: $("#newactive").is(":checked"),
    secret: $("#newpassword").val()
  }

  $.post("/pages/usernew/", userdata, (resp)=> {
    if ( resp.data && resp.data.id ) {
      location.reload()
    } else {
      // TODO: handle error
    }
  });
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

function userRemove() {
  $.post("/pages/userremove/"+$("#userremoveid").val(), (resp)=> {
    if ( resp.status=="success" ) {
      location.reload()
    } else {
      // TODO: handle error
    }
  });
}

function userEditFill(user) {
  $("#usereditid").val(user)

  $.get("/pages/users/"+user, (resp)=> {
    if ( resp.status=="success" ) {
      $("#editlogin").val(resp.data.login)
      $("#editemail").val(resp.data.email)
      $("#editlastname").val(resp.data.lastname)
      $("#editfirstname").val(resp.data.firstname)
      $("#editlocale").val(resp.data.locale)
      $("#editauthmethod").val(resp.data.authmethod)
      if ( !resp.data.active ) {
        $("#editactive").removeAttr("checked")
      }
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
    login: $("#editlogin").val(),
    email: $("#editemail").val(),
    lastname: $("#editlastname").val(),
    firstname: $("#editfirstname").val(),
    locale: $("#editlocale").val(),
    authmethod: $("#editauthmethod").val(),
    active: $("#editactive").is(":checked")
  }

  $.post("/pages/userupdate/"+$("#usereditid").val(), userdata, (resp)=> {
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

  // Sets the value for user to be deleted
  $("#removeuserdialog").on("show.bs.modal", (ev)=> {
    $("#userremoveid").val($(ev.relatedTarget).data("id"))
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