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

  $.get("/pages/folderinfo/"+currentFolder,(data)=>{
    if ( data && data.permissions && data.permissions.write ) {
      $("#newitem").removeAttr("disabled")
      $("#newfolder").removeAttr("disabled")
    } else {
      $("#newitem").attr("disabled","disabled")
      $("#newfolder").attr("disabled","disabled")
    }
  })
}

function hideNewItemModal() {
  $("#newitemdialogclose").click()
}

function toggleViewPassword() {
  if ( $("#newpassword").attr("type")=="password") {
    $("#newpassword").attr("type","text")
  } else {
    $("#newpassword").attr("type","password")
  }
}

function createItem() {
  let itemdata = {
    title: $("#newtitle").val(),
    description: $("#newdescription").val(),
    url: $("#newurl").val(),
    user: $("#newuser").val(),
    password: $("#newpassword").val()
  }

  $.post("/pages/itemnew/"+currentFolder, itemdata, (data)=> {
    if ( data && data.id ) {
      location.reload()
    } else {

    }
  });
}