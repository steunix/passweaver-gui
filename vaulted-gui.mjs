/**
 * Vaulted-gui, a GUI for Vaulted password manager
 *
 * (c) 2023 - Stefano Rivoir <rs4000@gmail.com>
 *
 * @module main
 * @author Stefano Rivoir <rs4000@gmail.com>
 */

import Express from 'express'
import compression from 'compression'

import * as Config from './src/config.mjs'
import * as Vaulted from './src/vaulted.mjs'
import session from 'express-session'
import FileStore from 'session-file-store'
import jsonwebtoken from 'jsonwebtoken'
import rateLimitMiddleware from "./src/ratelimiter.mjs"
import lusca from 'lusca'

const fileStore = FileStore(session)
export const app = Express()

const cfg = Config.get()

// Express middlewares
app.use(Express.json())
app.use(compression())
app.use(Express.urlencoded({ extended: true }))

// Session middleware
app.use(session({
  name: "vaultedgui",
  store: new fileStore({}),
  secret: cfg.session_key_env,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 4 }
}))

// CSFR protection
app.use(lusca.csrf({
  key: "_csrf",
  secret: cfg.csfr_key_env
}))

// Checks for valid session in pages/ subdir
app.use("/pages", function(req,res,next) {
  if ( req?.session?.user===undefined ) {
    res.status(401).redirect("/login?error=You need to login")
    return
  }
  return next()
})

// Use EJS
app.set('view engine', 'ejs');

// Static Middleware
app.use("/public", Express.static('public'))

// Rate limiter
app.use("/access", rateLimitMiddleware)

// Login page
app.get("/login", (req,res)=>{
  req.locals = {
    error: req.query.error,
    company_name: cfg.company_name,
    csfrtoken: req.csrfToken()
  }
  res.render('login', req.locals)
})

// Logout page
app.get("/logout", (req,res)=>{
  req.session.destroy()

  res.status(200).redirect("/login")
})

// Access page
app.post("/access", async (req,res)=>{
  const resp = await Vaulted.login(req.body.username, req.body.password)

  if ( resp.status!=="success" ) {
    res.status(401).redirect("/login?error="+resp.message)
    return
  }

  // Get user name
  req.session.jwt = resp.data.jwt
  const jwt = jsonwebtoken.decode(req.session.jwt)

  req.session.user = jwt.user

  const usr = await Vaulted.getUser(req.session, req.session.user)

  req.session.userdescription = (usr.data.lastname + " " + usr.data.firstname).trim()
  req.session.email = usr.data.email
  req.session.save()

  res.status(200).redirect("/pages/items")
})

// Items
app.get("/pages/items", async (req,res)=>{
  req.locals = {
    csfrtoken: req.csrfToken(),
    pagetitle: "Items",
    userdescription: req.session.userdescription
  }
  res.render('items', req.locals)
})

// Items list
app.get("/pages/itemslist/:folder", async (req,res)=>{
  const list = await Vaulted.itemslist(req.session, req.params.folder)
  res.status(200).json(list)
})

// Folder details
app.get("/pages/folders/:folder", async (req,res)=>{
  const info = await Vaulted.getFolder(req.session, req.params.folder)
  res.status(200).json(info)
})

// Get item
app.get("/pages/items/:item", async (req,res)=> {
  const resp = await Vaulted.itemGet(req.session, req.params.item, req.body)
  res.status(200).json(resp)
})

// Create item
app.post("/pages/itemnew/:folder", async (req,res)=> {
  const resp = await Vaulted.itemCreate(req.session, req.params.folder, req.body)
  res.status(200).json(resp)
})

// Delete item
app.post("/pages/itemremove/:item", async (req,res)=> {
  const resp = await Vaulted.itemRemove(req.session, req.params.item, req.body)
  res.status(200).json(resp)
})

// Update item
app.post("/pages/itemupdate/:item", async (req,res)=> {
  const resp = await Vaulted.itemUpdate(req.session, req.params.item, req.body)
  res.status(200).json(resp)
})

// Get folders tree
app.get("/pages/folderstree", async (req,res)=> {
  const resp = await Vaulted.foldersTree(req.session)
  res.status(200).json(resp)
})

// Create folder
app.post("/pages/foldernew/:folder", async (req,res)=> {
  const resp = await Vaulted.folderCreate(req.session, req.params.folder, req.body)
  res.status(200).json(resp)
})

// Delete folder
app.post("/pages/folderremove/:folder", async (req,res)=> {
  const resp = await Vaulted.folderRemove(req.session, req.params.folder, req.body)
  res.status(200).json(resp)
})

// Update folder
app.post("/pages/folderupdate/:folder", async (req,res)=> {
  const resp = await Vaulted.folderUpdate(req.session, req.params.folder, req.body)
  res.status(200).json(resp)
})

// Groups
app.get("/pages/groups", async (req,res)=>{
  var page = {
    csfrtoken: req.csrfToken(),
    pagetitle: "Groups",
    userdescription: req.session.userdescription
  }
  res.render('groups', page)
})

// Get groups tree
app.get("/pages/groupstree", async (req,res)=> {
  const resp = await Vaulted.groupsTree(req.session)
  res.status(200).json(resp)
})

// Group members list
app.get("/pages/userslist/:group", async (req,res)=>{
  const list = await Vaulted.usersList(req.session, req.params.group)
  res.status(200).json(list)
})

// Create group
app.post("/pages/groupnew/:group", async (req,res)=> {
  const resp = await Vaulted.groupCreate(req.session, req.params.group, req.body)
  res.status(200).json(resp)
})

// Group details
app.get("/pages/groups/:group", async (req,res)=>{
  const info = await Vaulted.getGroup(req.session, req.params.group)
  res.status(200).json(info)
})

// Update group
app.post("/pages/groupupdate/:group", async (req,res)=> {
  const resp = await Vaulted.groupUpdate(req.session, req.params.group, req.body)
  res.status(200).json(resp)
})

// Delete group
app.post("/pages/groupremove/:group", async (req,res)=> {
  const resp = await Vaulted.groupRemove(req.session, req.params.group)
  res.status(200).json(resp)
})

// Add user to group
app.post("/pages/groupadduser/:group/:user", async (req,res)=> {
  const resp = await Vaulted.groupAddUser(req.session, req.params.group, req.params.user)
  res.status(200).json(resp)
})

// Remove user from group
app.post("/pages/groupremoveuser/:group/:user", async (req,res)=> {
  const resp = await Vaulted.groupRemoveUser(req.session, req.params.group, req.params.user)
  res.status(200).json(resp)
})

// Users page
app.get("/pages/users", async(req,res)=> {
  var page = {
    csfrtoken: req.csrfToken(),
    pagetitle: "Users",
    userdescription: req.session.userdescription
  }
  res.render('users', page)
})

// Get users list
app.get("/pages/userslist", async (req,res)=> {
  const list = await Vaulted.usersList(req.session,null,req.query?.search)
  res.status(200).json(list)
})

// Create user
app.post("/pages/usernew", async (req,res)=> {
  const resp = await Vaulted.userCreate(req.session, req.body);
  res.status(200).json(resp)
})

// Get user
app.get("/pages/users/:item", async (req,res)=> {
  const resp = await Vaulted.userGet(req.session, req.params.item)
  res.status(200).json(resp)
})

// Update user
app.post("/pages/userupdate/:item", async (req,res)=> {
  const resp = await Vaulted.userUpdate(req.session, req.params.item, req.body)
  res.status(200).json(resp)
})

// Delete user
app.post("/pages/userremove/:user", async (req,res)=> {
  const resp = await Vaulted.userRemove(req.session, req.params.user)
  res.status(200).json(resp)
})

// Generate random password
app.get("/pages/generatepassword", async(req,res)=> {
  const resp = await Vaulted.generatePassword(req.session)
  res.status(200).json(resp)
})

// Folders
app.get("/pages/folders", async (req,res)=>{
  req.locals = {
    csfrtoken: req.csrfToken(),
    pagetitle: "Folders permissions",
    userdescription: req.session.userdescription
  }
  res.render('folders', req.locals)
})

// Get folder's groups
app.get("/pages/foldergroups/:id", async (req,res)=> {
  const resp = await Vaulted.folderGroups(req.session, req.params.id)
  res.status(200).json(resp)
})

console.log("Listening on port "+cfg.listen_port)

app.listen(cfg.listen_port)
