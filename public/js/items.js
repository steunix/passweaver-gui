let currentFolder = ""

function folderClicked(ev) {
  $("[role=treeitem]").css({"font-weight":"normal","background-color":"transparent"})
  $(this).css("font-weight","bold").css("background-color","#eeeeee")
  currentFolder = this.id
  localStorage.setItem("bstreeview_open_folderstree",currentFolder)
  $.get("/pages/itemslist/"+currentFolder,(resp)=>{
    $("#itemstable tr[id!=tableheader]").remove()
    if ( resp.data.length ) {
      for ( const itm of resp.data ) {
        $("#itemstable").append("<tr><td><i class='fa-solid fa-trash text-danger'></td><td>"+itm.title+"</td><td>"+itm.createdat+"</td></tr>")
      }
    }
  })

  $.get("/pages/folderinfo/"+currentFolder,(resp)=>{
    if ( resp.data && resp.data.permissions && resp.data.permissions.write ) {
      $("#newitem").removeAttr("disabled")
      $("#newfolder").removeAttr("disabled")
    } else {
      $("#newitem").attr("disabled","disabled")
      $("#newfolder").attr("disabled","disabled")
    }
  })
}

function toggleViewPassword() {
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

$(function() {
  $("#newitemdialog").on("hidden.bs.modal", ()=> {
    $(this).find("form").trigger("reset")
  })
})