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
import helmet from 'helmet'
import https from 'https'
import FS from 'fs'
import prettyBytes from 'pretty-bytes'

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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "script-src": ["'self'", "code.jquery.com", "cdn.jsdelivr.net"],
      "style-src": ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"],
    },
  },
}))
app.use(Express.json())
app.use(compression())
app.use(Express.urlencoded({ extended: true }))

// Session middleware
app.use(session({
  name: "vaultedgui",
  //store: new fileStore({}),
  secret: cfg.session_key,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 4 }
}))

// CSFR protection
app.use(lusca.csrf({
  key: "_csrf",
  secret: cfg.csfr_key
}))

// Checks for valid session in pages/ subdir
app.use("/pages", function(req,res,next) {
  if ( req?.session?.user===undefined ) {
    var link = "/login?error="+encodeURIComponent("You need to login")
    if ( req.query?.viewitem ) {
      link += "&viewitem="+encodeURIComponent(req.query.viewitem)
    }
    res.status(401).redirect(link)
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
app.get(["/login","/"], (req,res)=>{
  req.locals = {
    error: req.query.error,
    company_name: cfg.company_name,
    csfrtoken: req.csrfToken(),
    viewitem: req.query?.viewitem ?? ''
  }
  res.render('login', req.locals)
})

// Logout page
app.get("/logout", (req,res)=>{
  req.session.destroy()

  if ( req.query?.error ) {
    res.status(200).redirect("/login?error="+encodeURIComponent(req.query.error))
  } else {
    res.status(200).redirect("/login")
  }
})

// Access page
app.post("/access", async (req,res)=>{
  const resp = await Vaulted.login(req.body.username, req.body.password)

  if ( resp.status!=="success" ) {
    var link = "/login?error="+encodeURIComponent(resp.message)
    if ( req.body?.viewitem ) {
      link += "&viewitem="+encodeURIComponent(req.body.viewitem)
    }
    res.status(401).redirect(link)
    return
  }

  // Get user name
  req.session.jwt = resp.data.jwt
  const jwt = jsonwebtoken.decode(req.session.jwt)

  req.session.user = jwt.user
  req.session.admin = jwt.admin

  const usr = await Vaulted.getUser(req.session, req.session.user)

  req.session.userdescription = (usr.data.lastname + " " + usr.data.firstname).trim()
  req.session.email = usr.data.email
  req.session.save()

  if ( req.body?.viewitem ) {
    res.status(200).redirect("/pages/items?viewitem="+encodeURIComponent(req.body.viewitem))
  } else {
    res.status(200).redirect("/pages/items")
  }
})

// Items
app.get("/pages/items", async (req,res)=>{
  req.locals = {
    csfrtoken: req.csrfToken(),
    pagetitle: "Items",
    pageid: "items",
    userdescription: req.session.userdescription,
    admin: req.session.admin,
    viewitem: req.query?.viewitem ?? ''
  }
  res.render('items', req.locals)
})

// Items list
app.get("/pages/itemslist/:folder", async (req,res)=>{
  const list = await Vaulted.itemsList(req.session, req.params.folder, req.query?.search)
  res.status(200).json(list)
})

// Items search
app.get("/pages/itemssearch/", async (req,res)=>{
  const list = await Vaulted.itemsSearch(req.session, req.query?.search)
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

// Clone item
app.post("/pages/items/:item/clone", async (req,res)=> {
  const resp = await Vaulted.itemClone(req.session, req.params.item)
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
    pageid: "groups",
    userdescription: req.session.userdescription,
    admin: req.session.admin
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
    pageid: "users",
    userdescription: req.session.userdescription,
    admin: req.session.admin
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
    pageid: "folders",
    userdescription: req.session.userdescription,
    admin: req.session.admin
  }
  res.render('folders', req.locals)
})

// Get folder's groups
app.get("/pages/foldergroups/:id", async (req,res)=> {
  const resp = await Vaulted.folderGroups(req.session, req.params.id)
  res.status(200).json(resp)
})

// Get groups list
app.get("/pages/groupslist", async (req,res)=> {
  const list = await Vaulted.groupsList(req.session,req.query?.search)
  res.status(200).json(list)
})

// Add group to folder
app.post("/pages/folders/:folder/groups/:group", async(req,res)=> {
  const resp = await Vaulted.folderAddGroup(req.session, req.params.folder, req.params.group)
  res.status(200).json(resp)
})

// Remove group from folder
app.delete("/pages/folders/:folder/groups/:group", async(req,res)=> {
  const resp = await Vaulted.folderRemoveGroup(req.session, req.params.folder, req.params.group)
  res.status(200).json(resp)
})

// Toggle group permissions on folder
app.post("/pages/folders/:folder/groups/:group/toggle", async(req,res)=> {
  const resp = await Vaulted.folderToggleGroup(req.session, req.params.folder, req.params.group)
  res.status(200).json(resp)
})

// Search items
app.get("/pages/search", async (req,res)=>{
  req.locals = {
    csfrtoken: req.csrfToken(),
    pagetitle: "Search items",
    pageid: "search",
    userdescription: req.session.userdescription,
    admin: req.session.admin
  }
  res.render('search', req.locals)
})

// Generate password
app.get("/pages/generate", async (req,res)=>{
  req.locals = {
    csfrtoken: req.csrfToken(),
    pagetitle: "Password generator",
    pageid: "generate",
    userdescription: req.session.userdescription,
    admin: req.session.admin
  }
  res.render('generate', req.locals)
})

// Generate password
app.get("/pages/generate", async (req,res)=>{
  const resp = await Vaulted.generatePassword()
  res.status(200).json(resp)
})

// Create personal password
app.post("/pages/personalpassword", async (req,res)=>{
  const resp = await Vaulted.personalPasswordCreate(req.session, req.body.password)
  res.status(200).json(resp)
})

// Set personal password
app.post("/pages/personallogin", async (req,res)=>{
  const resp = await Vaulted.personalLogin(req, req.session, req.body.password)
  res.status(200).json(resp)
})

// Stats
app.get("/pages/stats", async(req,res)=> {
  var page = {
    csfrtoken: req.csrfToken(),
    pagetitle: "Stats",
    pageid: "stats",
    userdescription: req.session.userdescription,
    admin: req.session.admin
  }

  const resp = await Vaulted.stats(req.session)

  page.apiVersion = resp.data.version
  page.users = resp.data.users
  page.folders = resp.data.folders
  page.items = resp.data.items
  page.cacheSize = prettyBytes(resp.data.cacheSize)

  res.render('stats', page)
})

// Error handler
app.use((err, req, res, next)=> {
  res.status(200).redirect("/logout?error="+encodeURIComponent(err))
})

console.log("Listening on port "+cfg.listen_port)

// HTTP(S) server startup
if ( cfg.https.enabled ) {
  https.createServer({
    key: FS.readFileSync(cfg.https.private_key),
    cert: FS.readFileSync(cfg.https.certificate)
    },
    app
  ).listen(cfg.listen_port)
} else {
  app.listen(cfg.listen_port)
}