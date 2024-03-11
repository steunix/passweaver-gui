function spinnerShow() {
  $("body").append(`
  <div id="spinner" class="v-overlay">
    <div class="v-spinner">
      <div class="spinner-border text-success"></div>
    </div>
  </div>`
  );
}

function spinnerHide() {
  $("#spinner").remove()
}

function loadingShow(el) {
  el.addClass("v-blur")
}

function loadingHide(el) {
  el.removeClass("v-blur")
}

function generatePassword() {
  var resp = $.ajax({
    type: "GET",
    url: "/pages/generatepassword",
    async: false
  })

  return resp.responseJSON.data.password
}

function confirm(title,text,callback) {
  var dialog = bootstrap.Modal.getOrCreateInstance(document.getElementById("confirmdialog"), {})
  $("#confirmdialogtitle").html(title)
  $("#confirmdialogtext").html(text)
  $("#confirmdialogok").off("click").on("click", ()=>{
    dialog.hide()
    callback()
  })
  dialog.show()
}

function ensureVisibile(itm) {
  if ( !itm[0] ) {
    return
  }
  itm[0].scrollIntoView({block:"center"})
  return itm
}

function errorDialog(text) {
  var dialog = bootstrap.Modal.getOrCreateInstance(document.getElementById("errordialog"), {})
  $("#errordialogtext").html(text)
  dialog.show()
}

function checkResponse(resp,ignoreStatus) {
  if ( resp.status=="success" ) {
    return true
  }
  if ( resp.status=="failed" && resp.httpStatusCode=="404" ) {
    return true
  }
  if ( resp.status=="failed" && ignoreStatus && resp.httpStatusCode==ignoreStatus ) {
    return true
  }

  errorDialog(resp.message)

  if ( resp.status=="failed" && resp.fatal ) {
    window.location = "/logout?error="+encodeURIComponent(resp.message)
  }
}

function showToast(text) {
  $("#toasttext").html(text)
  $("#toast").addClass("show")
  setTimeout(()=>{
    $("#toast").removeClass("show")
  },3000)
}

$(()=>{
  if ( $("#pageid").length ) {
    const pageid = $("#pageid").data("pageid")
    $("#sidebar .nav-link[data-bs-original-title="+pageid+"]").addClass("active")
  }

  $(".copytoclipboard").on("click", (ev)=> {
    const id = $(ev.currentTarget).data("target")
    navigator.clipboard.writeText($("#"+id).val())
    showToast("Copied to clipboard")
  })

})
