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

const fileStore = FileStore(session)
export const app = Express()

const cfg = Config.get()

// Express middlewares
app.use(Express.json())
app.use(compression())
app.use(Express.urlencoded({ extended: true }))
app.use(session({
  name: "vaultedgui",
  store: new fileStore({}),
  secret: cfg.session_key_env,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 }
}))

// Checks for valid session in pages/ subdir
app.use("/pages", function(req,res,next) {
  if ( !req.session.userid ) {
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
  var data = {
    error: req.query.error,
    company_name: cfg.company_name
  }
  res.render('login', data)
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

  req.session.userid = jwt.user

  const usr = await Vaulted.getUser(req.session, req.session.user)

  req.session.userdescription = usr.data.description
  req.session.email = usr.data.email
  req.session.save()

  res.status(200).redirect("/pages/items")
})

// Items
app.get("/pages/items", async (req,res)=>{
  const tree = await Vaulted.foldersTree(req.session)

  var resp = { tree: tree.data || [] }
  if ( tree.status=="failed" ) {
    resp.error = tree.message
  }

  res.render('items', resp)
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
  const tree = await Vaulted.groupsTree(req.session)

  var resp = { tree: tree.data || [] }
  if ( tree.status=="failed" ) {
    resp.error = tree.message
  }

  res.render('groups', resp)
})

// Group members
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
app.post("/pages/groupremove/:folder", async (req,res)=> {
  const resp = await Vaulted.groupRemove(req.session, req.params.folder, req.body)
  res.status(200).json(resp)
})

console.log("Listening on port "+cfg.listen_port)

app.listen(cfg.listen_port)
